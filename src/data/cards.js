const HISTORY_DATES = Array.from({ length: 30 }, (_, index) => {
  const end = new Date('2025-02-28T00:00:00Z')
  end.setUTCDate(end.getUTCDate() - index)
  return end.toISOString().slice(0, 10)
})

const PLACEHOLDER_CARD_IMAGE = '/placeholders/card.svg'

const HISTORY_PROFILES = {
  stable: { slope: 0.008, volatility: 0.012 },
  uptrend: { slope: 0.14, volatility: 0.015 },
  vintage: { slope: 0.004, volatility: 0.006 },
  volatile: { slope: 0.03, volatility: 0.04 },
  bluechip: { slope: 0.012, volatility: 0.01 },
}

function roundToCents(value) {
  return Math.round(value * 100) / 100
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10
}

function buildPriceHistory(currentPrice, profileName, phase = 1) {
  const profile = HISTORY_PROFILES[profileName]

  return HISTORY_DATES.map((date, index) => {
    if (index === 0) {
      return { date, price: currentPrice }
    }

    const progress = (29 - index) / 29
    const trend = profile.slope * (progress - 1)
    const noise =
      Math.sin((index + 1) * (phase + 1)) * profile.volatility +
      Math.cos((index + 3) * (phase + 2)) * profile.volatility * 0.45

    const price = Math.max(1, currentPrice * (1 + trend + noise))
    return { date, price: roundToCents(price) }
  })
}

function attachSaleDetails(priceHistory, listings, fallbackCondition, phase = 1) {
  if (!Array.isArray(listings) || listings.length === 0) {
    return priceHistory.map((point) => ({
      ...point,
      saleDetail: `${fallbackCondition} · eBay · hobby_seller`,
    }))
  }

  return priceHistory.map((point, index) => {
    const listing = listings[(index + phase) % listings.length]
    return {
      ...point,
      saleDetail: `${listing.condition} · ${listing.platform} · ${listing.seller}`,
    }
  })
}

function summarizeHistory(priceHistory) {
  const prices = priceHistory.map((point) => point.price)
  const sorted = [...prices].sort((a, b) => a - b)
  const midLeft = sorted[14]
  const midRight = sorted[15]

  return {
    low: Math.round(sorted[0]),
    high: Math.round(sorted[sorted.length - 1]),
    median: Math.round((midLeft + midRight) / 2),
  }
}

function deriveSetBrand(setName) {
  const lower = setName.toLowerCase()
  if (lower.includes('prizm')) return { key: 'prizm', name: 'Panini Prizm' }
  if (lower.includes('optic')) return { key: 'optic', name: 'Donruss Optic' }
  if (lower.includes('mosaic')) return { key: 'mosaic', name: 'Panini Mosaic' }
  if (lower.includes('select')) return { key: 'select', name: 'Panini Select' }
  if (lower.includes('topps chrome')) return { key: 'topps-chrome', name: 'Topps Chrome' }
  if (lower.includes('topps')) return { key: 'topps', name: 'Topps' }
  if (lower.includes('upper deck')) return { key: 'upper-deck', name: 'Upper Deck' }
  if (lower.includes('fleer')) return { key: 'fleer', name: 'Fleer' }
  return { key: 'baseball', name: setName.split(' ').slice(1).join(' ') || setName }
}

function deriveSetInfo(card) {
  const brand = deriveSetBrand(card.set)
  const key = `${card.year}-${brand.key}-${card.sport.toLowerCase()}`
  const totals = {
    prizm: 300,
    optic: 200,
    mosaic: 300,
    select: 300,
    'topps-chrome': 220,
    topps: 330,
    'upper-deck': 800,
    fleer: 132,
    baseball: 250,
  }

  return {
    setKey: key,
    setName: `${card.year} ${brand.name} ${card.sport}`,
    totalInSet: totals[brand.key] ?? 250,
  }
}

function deriveBackImage(card) {
  if (card.imageBack === null) {
    return null
  }
  if (typeof card.imageBack === 'string') {
    return card.imageBack.startsWith('/cards/') ? null : card.imageBack
  }
  if (typeof card.image === 'string' && card.image.startsWith('/cards/')) {
    return null
  }
  return card.image.replace('.jpg', '-back.jpg')
}

function cleanInsertLabel(parallel) {
  return parallel
    .replace(/\s+insert/i, '')
    .replace(/\s+parallel/i, '')
    .trim()
}

function deriveCardKnowledge(card) {
  const tagsText = card.tags.join(' ').toLowerCase()
  const lowerParallel = card.parallel.toLowerCase()
  const badges = []

  if (tagsText.includes('rookie') || lowerParallel.includes('rookie')) {
    badges.push({
      label: 'RC',
      description: 'Rookie Card — first officially licensed card',
      type: 'rookie',
    })
  }

  if (card.numberedTo) {
    badges.push({
      label: `/${card.numberedTo}`,
      description: `Numbered to ${card.numberedTo} — only ${card.numberedTo} copies exist`,
      type: 'numbered',
    })
  }

  if (lowerParallel.includes('insert') || tagsText.includes('insert')) {
    const insertName = cleanInsertLabel(card.parallel)
    badges.push({
      label: insertName,
      description: `${insertName} is a themed insert subset with strong collector demand.`,
      type: 'insert',
    })
  } else {
    const parallelName = cleanInsertLabel(card.parallel)
    badges.push({
      label: parallelName,
      description:
        parallelName.toLowerCase() === 'base'
          ? 'Base issue from the flagship checklist with the deepest market liquidity.'
          : `${parallelName} is a sought-after parallel in this product run.`,
      type: 'parallel',
    })
  }

  if (card.year < 2000) {
    badges.push({
      label: 'Vintage',
      description: 'Pre-2000 card — part of the classic collecting era',
      type: 'vintage',
    })
  }

  if (/psa|bgs|sgc/i.test(card.condition)) {
    badges.push({
      label: card.condition,
      description: `Professionally graded by ${card.condition.split(' ')[0]} — grade ${card.condition.split(' ')[1] || ''} out of 10`.trim(),
      type: 'graded',
    })
  }

  badges.push({
    label: deriveSetBrand(card.set).name,
    description: `${card.set} is a cornerstone release with consistent demand in modern portfolio tracking.`,
    type: 'set',
  })

  if (badges.length < 2) {
    badges.unshift({
      label: 'Base',
      description: 'Base issue from the flagship checklist with reliable long-term liquidity.',
      type: 'parallel',
    })
  }

  return badges.slice(0, 4)
}

function createCard(card) {
  const baseHistory = buildPriceHistory(card.currentPrice, card.historyProfile, card.phase)
  const priceHistory = attachSaleDetails(baseHistory, card.listings, card.condition, card.phase)
  const oldest = baseHistory[baseHistory.length - 1].price
  const priceChange30d = roundToOneDecimal(((card.currentPrice - oldest) / oldest) * 100)
  const summary = summarizeHistory(baseHistory)

  return {
    id: card.id,
    playerName: card.playerName,
    team: card.team,
    sport: card.sport,
    set: card.set,
    parallel: card.parallel,
    year: card.year,
    cardNumber: card.cardNumber,
    condition: card.condition,
    currentPrice: card.currentPrice,
    priceChange30d,
    priceLow30d: summary.low,
    priceHigh30d: summary.high,
    priceMedian30d: summary.median,
    priceHistory,
    image:
      typeof card.image === 'string' && card.image.startsWith('/cards/')
        ? PLACEHOLDER_CARD_IMAGE
        : card.image,
    imageBack: deriveBackImage(card),
    setInfo: deriveSetInfo(card),
    psaPop: card.psaPop,
    listings: card.listings,
    aiInsight: card.aiInsight,
    tags: card.tags,
    cardKnowledge: card.cardKnowledge ?? deriveCardKnowledge(card),
  }
}

export const cards = [
  createCard({
    id: 'card-1',
    playerName: 'Josh Allen',
    team: 'Buffalo Bills',
    sport: 'NFL',
    set: '2023 Panini Prizm',
    parallel: 'Base',
    year: 2023,
    cardNumber: '42',
    condition: 'Raw',
    currentPrice: 85,
    historyProfile: 'stable',
    phase: 1,
    image: '/cards/allen-prizm-2023.jpg',
    psaPop: { '10': 1240, '9': 3015, '8': 1184 },
    listings: [
      { platform: 'eBay', seller: 'cardvault99', price: 82, condition: 'Raw NM', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 89, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 79, condition: 'Raw', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 87, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      "Allen's 2023 Prizm base is trading in a tight range and liquidity remains strong for mid-tier NFL quarterbacks. The card sits near its 30-day median, so timing is less about catching dips and more about buying clean centering. If you want broad market exposure to Allen, this is one of the easiest cards to move quickly.",
    tags: ['nfl', 'allen', 'prizm', 'base', 'quarterback'],
  }),
  createCard({
    id: 'card-2',
    playerName: 'Luka Doncic',
    team: 'Dallas Mavericks',
    sport: 'NBA',
    set: '2023-24 Panini Prizm',
    parallel: 'Deep Space Insert',
    year: 2023,
    cardNumber: 'DS-7',
    condition: 'Raw',
    currentPrice: 320,
    historyProfile: 'volatile',
    phase: 2,
    image: '/cards/doncic-prizm-deep-space.jpg',
    psaPop: { '10': 328, '9': 702, '8': 214 },
    listings: [
      { platform: 'eBay', seller: 'topslabs_cards', price: 305, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 338, condition: 'PSA 10', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 289, condition: 'Raw EX', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 326, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Deep Space is one of the most visually striking Prizm inserts, and Doncic collectors consistently pay for eye appeal in this insert run. Current pricing is close to recent support, which lowers downside risk versus buying after spikes. For a non-rookie Luka card, this has better collector demand than many base parallels in the same class.',
    tags: ['nba', 'doncic', 'prizm', 'deep-space', 'insert'],
  }),
  createCard({
    id: 'card-3',
    playerName: 'Luka Doncic',
    team: 'Dallas Mavericks',
    sport: 'NBA',
    set: '2018-19 Panini Prizm',
    parallel: 'Base Rookie',
    year: 2018,
    cardNumber: '280',
    condition: 'Raw',
    currentPrice: 450,
    historyProfile: 'bluechip',
    phase: 3,
    image: '/cards/doncic-prizm-rookie-2018.jpg',
    psaPop: { '10': 918, '9': 2146, '8': 744 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 429, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 472, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'slabkings', price: 461, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Monthly Elite', price: 448, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Doncic Prizm rookie remains one of the cornerstone modern NBA cards because it combines iconic set status with strong long-term demand. The 30-day chart is stable with only mild movement, which is typical for a blue-chip rookie in this price tier. If you are building around liquid cards that institutional buyers also track, this is a core holding.',
    tags: ['nba', 'doncic', 'prizm', 'rookie', 'blue-chip'],
  }),
  createCard({
    id: 'card-4',
    playerName: 'Anthony Edwards',
    team: 'Minnesota Timberwolves',
    sport: 'NBA',
    set: '2023-24 Donruss Optic',
    parallel: 'My House Insert',
    year: 2023,
    cardNumber: 'MH-AE',
    condition: 'Raw',
    currentPrice: 95,
    historyProfile: 'uptrend',
    phase: 4,
    image: '/cards/edwards-optic-myhouse.jpg',
    psaPop: { '10': 462, '9': 996, '8': 310 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 91, condition: 'Raw NM', url: '#' },
      { platform: 'eBay', seller: 'card_investor_22', price: 99, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 88, condition: 'Raw', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 103, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      "Edwards momentum has translated directly into Optic insert demand, especially for recognizable designs like My House. This card has trended upward over the last month while still pricing below many equivalent star inserts. If you're targeting growth names before another playoff push, this profile is attractive.",
    tags: ['nba', 'edwards', 'optic', 'my-house', 'insert'],
  }),
  createCard({
    id: 'card-5',
    playerName: 'Ken Griffey Jr.',
    team: 'Seattle Mariners',
    sport: 'MLB',
    set: '1989 Upper Deck',
    parallel: 'Base Rookie',
    year: 1989,
    cardNumber: '1',
    condition: 'Raw',
    currentPrice: 180,
    historyProfile: 'vintage',
    phase: 5,
    image: '/cards/griffey-upper-deck-1989.jpg',
    psaPop: { '10': 96, '9': 412, '8': 1304 },
    listings: [
      { platform: 'eBay', seller: 'vintagesportscards', price: 172, condition: 'Raw EX', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 188, condition: 'PSA 8', url: '#' },
      { platform: 'eBay', seller: 'slabkings', price: 183, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 176, condition: 'Raw', url: '#' },
    ],
    aiInsight:
      "Griffey's 1989 Upper Deck rookie has shown durable long-term appreciation and remains a cornerstone baseball card for both investors and nostalgia buyers. This raw copy is moving very little day to day, which is normal for established vintage-adjacent pieces. It is a practical entry point if you want iconic history without graded-premium pricing.",
    tags: ['mlb', 'griffey', 'upper-deck', 'rookie', 'vintage'],
  }),
  createCard({
    id: 'card-6',
    playerName: 'Ken Griffey Jr.',
    team: 'Seattle Mariners',
    sport: 'MLB',
    set: '1989 Upper Deck',
    parallel: 'Base Rookie',
    year: 1989,
    cardNumber: '1',
    condition: 'PSA 9',
    currentPrice: 350,
    historyProfile: 'vintage',
    phase: 6,
    image: '/cards/griffey-upper-deck-rookie.jpg',
    psaPop: { '10': 96, '9': 412, '8': 1304 },
    listings: [
      { platform: 'eBay', seller: 'vintagesportscards', price: 334, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 362, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 347, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 356, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'A PSA 9 Griffey rookie gives you cleaner downside protection than raw copies because condition risk is already standardized. This card behaves like a classic legacy asset with modest fluctuations and deep buyer pools. For portfolio balance, it pairs well with modern high-volatility rookies.',
    tags: ['mlb', 'griffey', 'upper-deck', 'rookie', 'graded', 'vintage'],
  }),
  createCard({
    id: 'card-7',
    playerName: 'Michael Jordan',
    team: 'Chicago Bulls',
    sport: 'NBA',
    set: '1986-87 Fleer',
    parallel: 'Base',
    year: 1986,
    cardNumber: '57',
    condition: 'Raw',
    currentPrice: 4500,
    historyProfile: 'vintage',
    phase: 7,
    image: '/cards/jordan-fleer-1986.jpg',
    psaPop: { '10': 34, '9': 327, '8': 1548 },
    listings: [
      { platform: 'Goldin', seller: 'Elite Weekly', price: 4720, condition: 'Raw EX-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 4395, condition: 'Raw NM', url: '#' },
      { platform: 'eBay', seller: 'vintagesportscards', price: 4190, condition: 'Raw EX', url: '#' },
      { platform: 'Goldin', seller: 'Collector Vault', price: 4580, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      "The 1986-87 Fleer Jordan is one of the most iconic basketball cards ever printed and remains a benchmark for the hobby's vintage segment. Raw examples are highly condition-sensitive, so eye appeal and authenticity confidence matter more than short-term price swings. This copy offers prestige and collection gravity that modern cards rarely match.",
    tags: ['nba', 'jordan', 'fleer', 'vintage', 'base', 'grail'],
  }),
  createCard({
    id: 'card-8',
    playerName: 'Michael Jordan',
    team: 'Chicago Bulls',
    sport: 'NBA',
    set: '1986-87 Fleer',
    parallel: 'Base Rookie',
    year: 1986,
    cardNumber: '57',
    condition: 'PSA 8',
    currentPrice: 12000,
    historyProfile: 'bluechip',
    phase: 8,
    image: '/cards/jordan-fleer-rookie.jpg',
    psaPop: { '10': 34, '9': 327, '8': 1548 },
    listings: [
      { platform: 'Goldin', seller: 'Blue Chip Auction', price: 12600, condition: 'PSA 8', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 11850, condition: 'PSA 8', url: '#' },
      { platform: 'Goldin', seller: 'Legacy Vault', price: 12240, condition: 'PSA 8', url: '#' },
      { platform: 'PWCC', seller: 'Elite Monthly', price: 11990, condition: 'PSA 8', url: '#' },
    ],
    aiInsight:
      'A PSA 8 Jordan rookie is the institutional-grade entry point for serious vintage basketball capital. Price movement over the last month has been controlled, which is common for high-liquidity grail assets. If your collection lacks a flagship legacy card, this is the cleanest way to add one with clear market comps.',
    tags: ['nba', 'jordan', 'fleer', 'rookie', 'graded', 'vintage'],
  }),
  createCard({
    id: 'card-9',
    playerName: 'LeBron James',
    team: 'Los Angeles Lakers',
    sport: 'NBA',
    set: '2023-24 Panini Mosaic',
    parallel: 'Base',
    year: 2023,
    cardNumber: '290',
    condition: 'Raw',
    currentPrice: 45,
    historyProfile: 'stable',
    phase: 9,
    image: '/cards/lebron-james-mosaic.jpg',
    psaPop: { '10': 1468, '9': 3372, '8': 981 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 42, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'rookiewatch_shop', price: 44, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'cardvault99', price: 47, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 41, condition: 'Raw EX', url: '#' },
    ],
    aiInsight:
      "LeBron's Mosaic base is a low-volatility way to keep exposure to one of the hobby's most collected modern players. The spread between low and high sales is narrow, signaling stable demand and easy comping. This is more of a liquidity card than a breakout play, but it works well for steady portfolio depth.",
    tags: ['nba', 'lebron', 'mosaic', 'base', 'veteran'],
  }),
  createCard({
    id: 'card-10',
    playerName: 'LeBron James',
    team: 'Los Angeles Lakers',
    sport: 'NBA',
    set: '2023-24 Panini Prizm',
    parallel: 'Base',
    year: 2023,
    cardNumber: '145',
    condition: 'Raw',
    currentPrice: 55,
    historyProfile: 'stable',
    phase: 10,
    image: '/cards/lebron-prizm-2023.jpg',
    psaPop: { '10': 1332, '9': 2954, '8': 872 },
    listings: [
      { platform: 'eBay', seller: 'topslabs_cards', price: 52, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 54, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 57, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 50, condition: 'Raw EX', url: '#' },
    ],
    aiInsight:
      'Prizm gives LeBron broader market liquidity than most non-rookie modern sets, which keeps this card easy to buy and sell. The last month has been nearly flat with minor noise, matching the profile of a mature veteran market. It is a practical anchor card if you want consistent comps and low drawdown risk.',
    tags: ['nba', 'lebron', 'prizm', 'base', 'liquid'],
  }),
  createCard({
    id: 'card-11',
    playerName: 'Luka Doncic',
    team: 'Dallas Mavericks',
    sport: 'NBA',
    set: '2023-24 Donruss Optic',
    parallel: 'Purple Parallel',
    year: 2023,
    cardNumber: '177',
    condition: 'Raw',
    currentPrice: 210,
    historyProfile: 'volatile',
    phase: 11,
    image: '/cards/luka-doncic-optic-purple.jpg',
    psaPop: { '10': 286, '9': 681, '8': 203 },
    listings: [
      { platform: 'eBay', seller: 'slabkings', price: 198, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 223, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 214, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 206, condition: 'BGS 9.5', url: '#' },
    ],
    aiInsight:
      'Doncic Optic Purple trades more like a scarcity-driven parallel than a standard base card, so price swings can be sharper around big game windows. Population remains controlled compared with base runs, which supports stronger floor behavior on quality copies. This is a strong mid-tier Doncic hold if you prefer scarcity over volume.',
    tags: ['nba', 'doncic', 'optic', 'purple', 'parallel'],
  }),
  createCard({
    id: 'card-12',
    playerName: 'Patrick Mahomes',
    team: 'Kansas City Chiefs',
    sport: 'NFL',
    set: '2023 Donruss Optic',
    parallel: 'Base',
    year: 2023,
    cardNumber: '215',
    condition: 'Raw',
    currentPrice: 72,
    historyProfile: 'stable',
    phase: 12,
    image: '/cards/mahomes-optic-2023.jpg',
    psaPop: { '10': 1415, '9': 3188, '8': 995 },
    listings: [
      { platform: 'eBay', seller: 'cardvault99', price: 69, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 66, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 75, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'rookiewatch_shop', price: 71, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      "Mahomes Optic base has held up well as a core quarterback card, especially during offseason uncertainty. Current pricing is close to the 30-day midpoint, so entries here are mostly fair-value buys. It fits best as a stable NFL allocation rather than a momentum trade.",
    tags: ['nfl', 'mahomes', 'optic', 'base', 'quarterback'],
  }),
  createCard({
    id: 'card-13',
    playerName: 'Patrick Mahomes',
    team: 'Kansas City Chiefs',
    sport: 'NFL',
    set: '2023 Panini Prizm',
    parallel: 'Base',
    year: 2023,
    cardNumber: '175',
    condition: 'Raw',
    currentPrice: 68,
    historyProfile: 'stable',
    phase: 13,
    image: '/cards/mahomes-prizm-2023.jpg',
    psaPop: { '10': 1532, '9': 3499, '8': 1098 },
    listings: [
      { platform: 'eBay', seller: 'card_investor_22', price: 64, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 63, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 71, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 67, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Prizm gives Mahomes stronger mainstream demand than many comparable modern football bases. The month-long trend is almost flat, reflecting a mature pricing zone with low volatility. It is a dependable hold for collectors who want blue-chip NFL without paying rookie premiums.',
    tags: ['nfl', 'mahomes', 'prizm', 'base', 'veteran'],
  }),
  createCard({
    id: 'card-14',
    playerName: 'Shohei Ohtani',
    team: 'Los Angeles Dodgers',
    sport: 'MLB',
    set: '2022 Panini Prizm',
    parallel: 'Base',
    year: 2022,
    cardNumber: '88',
    condition: 'Raw',
    currentPrice: 110,
    historyProfile: 'volatile',
    phase: 14,
    image: '/cards/ohtani-prizm-2022.jpg',
    psaPop: { '10': 992, '9': 2241, '8': 713 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 103, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 116, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'cardvault99', price: 108, condition: 'Raw EX', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 112, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Ohtani Prizm has become more headline-sensitive, producing sharper short-term swings than his flagship Topps rookie lines. This month shows mixed movement, which creates tactical buy windows when sentiment cools. For upside, target centered copies since grade outcomes can separate value quickly.',
    tags: ['mlb', 'ohtani', 'prizm', 'base', 'volatile'],
  }),
  createCard({
    id: 'card-15',
    playerName: 'Shohei Ohtani',
    team: 'Los Angeles Angels',
    sport: 'MLB',
    set: '2018 Topps Chrome',
    parallel: 'Rookie Refractor',
    year: 2018,
    cardNumber: '150',
    condition: 'Raw',
    currentPrice: 280,
    historyProfile: 'bluechip',
    phase: 15,
    image: '/cards/ohtani-topps-chrome-rookie.jpg',
    psaPop: { '10': 674, '9': 1488, '8': 522 },
    listings: [
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 266, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 294, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 286, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 278, condition: 'BGS 9.5', url: '#' },
    ],
    aiInsight:
      "Ohtani's Topps Chrome rookie refractor is one of the most globally recognized modern baseball cards and behaves like a premium benchmark. Price action is steady with narrow variance, which often signals strong conviction holders. If you want one Ohtani card with broad long-term appeal, this is near the top of the list.",
    tags: ['mlb', 'ohtani', 'topps-chrome', 'rookie', 'refractor'],
  }),
  createCard({
    id: 'card-16',
    playerName: 'Shohei Ohtani',
    team: 'Los Angeles Dodgers',
    sport: 'MLB',
    set: '2023 Topps Chrome',
    parallel: 'Platinum',
    year: 2023,
    cardNumber: '201',
    condition: 'Raw',
    currentPrice: 165,
    historyProfile: 'volatile',
    phase: 16,
    image: '/cards/ohtani-topps-platinum.jpg',
    psaPop: { '10': 352, '9': 809, '8': 245 },
    listings: [
      { platform: 'eBay', seller: 'slabkings', price: 158, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 174, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'premiumbreaks', price: 169, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 161, condition: 'SGC 10', url: '#' },
    ],
    aiInsight:
      'The Platinum treatment adds scarcity appeal versus standard Ohtani chrome cards, but demand can be momentum-driven. Recent trading has been choppy, giving patient buyers chances to pick up copies below recent highs. It works best as a tactical position alongside a more stable Ohtani cornerstone card.',
    tags: ['mlb', 'ohtani', 'topps-chrome', 'platinum', 'parallel'],
  }),
  createCard({
    id: 'card-17',
    playerName: 'Julio Rodriguez',
    team: 'Seattle Mariners',
    sport: 'MLB',
    set: '2022 Panini Mosaic',
    parallel: 'Rookie',
    year: 2022,
    cardNumber: '274',
    condition: 'Raw',
    currentPrice: 75,
    historyProfile: 'volatile',
    phase: 17,
    image: '/cards/rodriguez-mosaic-rookie.jpg',
    psaPop: { '10': 1086, '9': 2525, '8': 806 },
    listings: [
      { platform: 'eBay', seller: 'cardvault99', price: 72, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 69, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 79, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 73, condition: 'Raw EX', url: '#' },
    ],
    aiInsight:
      'Rodriguez Mosaic rookie has been range-bound with periodic spikes tied to performance headlines and prospect sentiment. The current level is near the lower half of recent sales, which improves risk/reward for patient entries. This is a solid speculative rookie if you are comfortable with moderate volatility.',
    tags: ['mlb', 'rodriguez', 'mosaic', 'rookie', 'prospect'],
  }),
  createCard({
    id: 'card-18',
    playerName: 'CJ Stroud',
    team: 'Houston Texans',
    sport: 'NFL',
    set: '2023 Donruss Optic',
    parallel: 'Hidden Potential Insert',
    year: 2023,
    cardNumber: 'HP-CJS',
    condition: 'Raw',
    currentPrice: 130,
    historyProfile: 'uptrend',
    phase: 18,
    image: '/cards/stroud-optic-hidden-potential.jpg',
    psaPop: { '10': 518, '9': 1124, '8': 326 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 122, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 137, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 132, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 128, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Stroud insert demand has strengthened as collectors price in his franchise-quarterback trajectory. Hidden Potential is still early in the hype cycle relative to flagship rookies, so upside can remain. The last 30 days show a clear upward channel, which supports momentum-based accumulation.',
    tags: ['nfl', 'stroud', 'optic', 'hidden-potential', 'insert', 'rookie'],
  }),
  createCard({
    id: 'card-19',
    playerName: 'CJ Stroud',
    team: 'Houston Texans',
    sport: 'NFL',
    set: '2023 Donruss Optic',
    parallel: 'Rated Rookie',
    year: 2023,
    cardNumber: '244',
    condition: 'Raw',
    currentPrice: 95,
    historyProfile: 'uptrend',
    phase: 19,
    image: '/cards/stroud-optic-rookie.jpg',
    psaPop: { '10': 884, '9': 1970, '8': 602 },
    listings: [
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 91, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 88, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 99, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 102, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      "Rated Rookie is the most recognizable Optic rookie format, so Stroud's version benefits from both branding and player momentum. The card has climbed steadily through the month with healthy transaction volume. For medium-term NFL upside, this is one of the cleaner entries under three figures.",
    tags: ['nfl', 'stroud', 'optic', 'rated-rookie', 'rookie'],
  }),
  createCard({
    id: 'card-20',
    playerName: 'Jayson Tatum',
    team: 'Boston Celtics',
    sport: 'NBA',
    set: '2023-24 Panini Prizm',
    parallel: 'Ice Parallel',
    year: 2023,
    cardNumber: '133',
    condition: 'Raw',
    currentPrice: 145,
    historyProfile: 'volatile',
    phase: 20,
    image: '/cards/tatum-prizm-ice.jpg',
    psaPop: { '10': 287, '9': 664, '8': 201 },
    listings: [
      { platform: 'eBay', seller: 'slabkings', price: 136, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 153, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'premiumbreaks', price: 147, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 142, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'The Ice parallel is hobby-exclusive and materially scarcer than standard Prizm base runs, which supports stronger collector premiums. Tatum pricing has been mixed this month, creating alternating buy and sell windows around team-performance swings. If you want scarcity with playoff upside, this is a sharp target at current levels.',
    tags: ['nba', 'tatum', 'prizm', 'ice', 'parallel'],
  }),
  createCard({
    id: 'card-21',
    playerName: 'Jayson Tatum',
    team: 'Boston Celtics',
    sport: 'NBA',
    set: '2023-24 Panini Prizm',
    parallel: 'Silver',
    year: 2023,
    cardNumber: '133',
    condition: 'Raw',
    currentPrice: 115,
    historyProfile: 'volatile',
    phase: 21,
    image: '/cards/tatum-prizm-silver.jpg',
    psaPop: { '10': 522, '9': 1141, '8': 347 },
    listings: [
      { platform: 'eBay', seller: 'topslabs_cards', price: 108, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 121, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 117, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 113, condition: 'BGS 9.5', url: '#' },
    ],
    aiInsight:
      'Prizm Silver remains the gold-standard modern basketball parallel because it is more liquid than most color alternatives. Tatum Silver has shown two-way volatility recently, but comps continue to clear quickly when priced right. This is a strong card for active traders who want depth and fast exits.',
    tags: ['nba', 'tatum', 'prizm', 'silver', 'parallel'],
  }),
  createCard({
    id: 'card-22',
    playerName: 'Jayson Tatum',
    team: 'Boston Celtics',
    sport: 'NBA',
    set: '2023-24 Topps Chrome',
    parallel: 'Royalty Insert',
    year: 2023,
    cardNumber: 'RY-JT',
    condition: 'Raw',
    currentPrice: 88,
    historyProfile: 'volatile',
    phase: 22,
    image: '/cards/tatum-topps-chrome-royalty.jpg',
    psaPop: { '10': 409, '9': 921, '8': 275 },
    listings: [
      { platform: 'eBay', seller: 'card_investor_22', price: 82, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 84, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'premiumbreaks', price: 92, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 95, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Topps Chrome Royalty gives Tatum collectors an alternative look outside the crowded Prizm ecosystem. The card has had uneven month-to-month movement, but downside has been supported by steady Celtics demand. It fits best as a complementary piece if your core stack is already Prizm-heavy.',
    tags: ['nba', 'tatum', 'topps-chrome', 'royalty', 'insert'],
  }),
  createCard({
    id: 'card-23',
    playerName: 'Victor Wembanyama',
    team: 'San Antonio Spurs',
    sport: 'NBA',
    set: '2023-24 Donruss Optic',
    parallel: 'Splash Insert',
    year: 2023,
    cardNumber: 'SP-VW',
    condition: 'Raw',
    currentPrice: 185,
    historyProfile: 'uptrend',
    phase: 23,
    image: '/cards/wembanyama-optic-splash.jpg',
    psaPop: { '10': 612, '9': 1315, '8': 382 },
    listings: [
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 176, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 194, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 188, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 182, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Wembanyama continues to profile as a generational talent, and Optic Splash has become one of the fan-favorite rookie inserts tied to his early market. The last 30 days show a steady climb with strong buyer participation on graded copies. This card offers upside with better affordability than his top-tier rookie parallels.',
    tags: ['nba', 'wembanyama', 'optic', 'splash', 'insert', 'rookie'],
  }),
  createCard({
    id: 'card-24',
    playerName: 'Victor Wembanyama',
    team: 'San Antonio Spurs',
    sport: 'NBA',
    set: '2023-24 Panini Prizm',
    parallel: 'Rookie Base',
    year: 2023,
    cardNumber: '136',
    condition: 'Raw',
    currentPrice: 160,
    historyProfile: 'uptrend',
    phase: 24,
    image: '/cards/wembanyama-prizm-rookie.jpg',
    psaPop: { '10': 974, '9': 2168, '8': 644 },
    listings: [
      { platform: 'eBay', seller: 'topslabs_cards', price: 152, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 168, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'cardvault99', price: 163, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 157, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Prizm rookie base is the flagship liquid entry for Wembanyama and typically leads his broader market sentiment. Pricing has trended upward through the month, suggesting sustained demand rather than a one-day spike. If you want long-term exposure with maximum market depth, this is the most practical Wemby card to stack.',
    tags: ['nba', 'wembanyama', 'prizm', 'rookie', 'base'],
  }),
  createCard({
    id: 'card-25',
    playerName: 'Caleb Williams',
    team: 'Chicago Bears',
    sport: 'NFL',
    set: '2024 Panini Mosaic',
    parallel: 'Pink Camo Parallel',
    year: 2024,
    cardNumber: '212',
    condition: 'Raw',
    currentPrice: 110,
    historyProfile: 'uptrend',
    phase: 25,
    image: '/cards/williams-mosaic-pink-camo.jpg',
    psaPop: { '10': 546, '9': 1178, '8': 348 },
    listings: [
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 104, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 116, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'card_investor_22', price: 109, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 112, condition: 'SGC 10', url: '#' },
    ],
    aiInsight:
      'Caleb Williams rookie demand has accelerated as collectors position early around his NFL trajectory. Pink Camo brings more visual differentiation than base Mosaic while staying accessible for active buyers. The monthly trend is clearly positive, so disciplined dip buys are the better strategy than chasing peak auctions.',
    tags: ['nfl', 'williams', 'mosaic', 'pink-camo', 'rookie', 'parallel'],
  }),
  createCard({
    id: 'card-26',
    playerName: 'Saquon Barkley',
    team: 'Philadelphia Eagles',
    sport: 'NFL',
    set: '2024 Panini Mosaic',
    parallel: 'Base',
    year: 2024,
    cardNumber: '117',
    condition: 'Raw',
    currentPrice: 55,
    historyProfile: 'stable',
    phase: 26,
    image: '/cards/barkley-mosaic-2024.jpg',
    psaPop: { '10': 1132, '9': 2556, '8': 808 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 52, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 50, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabkings', price: 57, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'rookiewatch_shop', price: 54, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      "Barkley's move into the Eagles ecosystem has kept demand steady for flagship Mosaic base cards. This card has held a stable range with enough transaction volume for reliable comping. It's a low-friction veteran exposure card for collectors who want liquidity over volatility.",
    tags: ['nfl', 'barkley', 'mosaic', 'base', 'running-back'],
  }),
  createCard({
    id: 'card-27',
    playerName: 'Mookie Betts',
    team: 'Los Angeles Dodgers',
    sport: 'MLB',
    set: '2022 Panini Prizm',
    parallel: 'Base',
    year: 2022,
    cardNumber: '84',
    condition: 'Raw',
    currentPrice: 42,
    historyProfile: 'stable',
    phase: 27,
    image: '/cards/betts-prizm-2022.jpg',
    psaPop: { '10': 1016, '9': 2367, '8': 712 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 39, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 41, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'thehobbybox', price: 45, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 40, condition: 'Raw EX', url: '#' },
    ],
    aiInsight:
      'Betts Prizm base is a pragmatic hold for MLB portfolios focused on elite active veterans. Pricing has stayed calm over the last month with tight spread between low and high sales. It works best as a stable anchor around higher-beta rookie positions.',
    tags: ['mlb', 'betts', 'prizm', 'base', 'dodgers'],
  }),
  createCard({
    id: 'card-28',
    playerName: 'Mookie Betts',
    team: 'Los Angeles Dodgers',
    sport: 'MLB',
    set: '2022 Panini Prizm',
    parallel: 'Red Parallel',
    year: 2022,
    cardNumber: '84',
    condition: 'Raw',
    currentPrice: 125,
    historyProfile: 'volatile',
    phase: 28,
    image: '/cards/betts-prizm-red.jpg',
    numberedTo: 299,
    psaPop: { '10': 224, '9': 503, '8': 177 },
    listings: [
      { platform: 'eBay', seller: 'topslabs_cards', price: 118, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 133, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 127, condition: 'Raw NM-MT', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 121, condition: 'Raw', url: '#' },
    ],
    aiInsight:
      'Betts Red Parallel offers a cleaner scarcity angle than base while staying in a tradable price band. Numbered copies tend to hold collector premiums even when overall veteran markets cool. This profile is attractive for medium-term appreciation with manageable downside.',
    tags: ['mlb', 'betts', 'prizm', 'red', 'parallel', 'numbered'],
  }),
  createCard({
    id: 'card-29',
    playerName: 'Stephen Curry',
    team: 'Golden State Warriors',
    sport: 'NBA',
    set: '2020-21 Panini Mosaic',
    parallel: 'Base',
    year: 2020,
    cardNumber: '1',
    condition: 'Raw',
    currentPrice: 52,
    historyProfile: 'stable',
    phase: 29,
    image: '/cards/curry-mosaic-2020.jpg',
    psaPop: { '10': 1279, '9': 2912, '8': 894 },
    listings: [
      { platform: 'eBay', seller: 'cardvault99', price: 48, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 50, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 54, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 51, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Curry Mosaic base maintains excellent liquidity due to broad fan-driven demand and multi-year relevance. Recent action has been flat, which often creates low-stress entry points for long-term collectors. This card is ideal for balancing volatility from younger-player bets.',
    tags: ['nba', 'curry', 'mosaic', 'base', 'warriors'],
  }),
  createCard({
    id: 'card-30',
    playerName: 'Kevin Durant',
    team: 'Phoenix Suns',
    sport: 'NBA',
    set: '2022-23 Donruss Optic',
    parallel: 'Base',
    year: 2022,
    cardNumber: '98',
    condition: 'Raw',
    currentPrice: 38,
    historyProfile: 'stable',
    phase: 30,
    image: '/cards/durant-optic-2022.jpg',
    psaPop: { '10': 876, '9': 2103, '8': 644 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 35, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 36, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabkings', price: 40, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Durant Optic base sits in a low-volatility veteran lane with consistent, if unspectacular, turnover. Market pricing has compressed into a narrow channel over 30 days, improving confidence in fair-value entries. It is a strong depth piece rather than a momentum trade.',
    tags: ['nba', 'durant', 'optic', 'base', 'suns'],
  }),
  createCard({
    id: 'card-31',
    playerName: 'Giannis Antetokounmpo',
    team: 'Milwaukee Bucks',
    sport: 'NBA',
    set: '2021-22 Panini Prizm',
    parallel: 'Base',
    year: 2021,
    cardNumber: '101',
    condition: 'Raw',
    currentPrice: 65,
    historyProfile: 'stable',
    phase: 31,
    image: '/cards/giannis-prizm-2021.jpg',
    psaPop: { '10': 1188, '9': 2742, '8': 821 },
    listings: [
      { platform: 'eBay', seller: 'card_investor_22', price: 61, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 62, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 68, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 70, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Giannis Prizm base remains one of the cleaner modern superstar holdings in the sub-$100 lane. The card has maintained stable comps and reliable buyer depth across platforms. For portfolio construction, it offers steady blue-chip exposure without rookie premiums.',
    tags: ['nba', 'giannis', 'prizm', 'base', 'bucks'],
  }),
  createCard({
    id: 'card-32',
    playerName: 'Giannis Antetokounmpo',
    team: 'Milwaukee Bucks',
    sport: 'NBA',
    set: '2021-22 Panini Prizm',
    parallel: 'Deep Space Insert',
    year: 2021,
    cardNumber: 'DS-GA',
    condition: 'Raw',
    currentPrice: 245,
    historyProfile: 'volatile',
    phase: 32,
    image: '/cards/giannis-prizm-deep-space.jpg',
    imageBack: null,
    psaPop: { '10': 246, '9': 549, '8': 181 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 232, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Premier Auction', price: 254, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 248, condition: 'Raw NM-MT', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 239, condition: 'BGS 9.5', url: '#' },
    ],
    aiInsight:
      'Deep Space inserts for top-tier stars like Giannis trade with stronger scarcity premiums than most standard parallels. Price action has been choppy, but buyers consistently defend lower support zones on clean copies. This is a collector-forward play with meaningful upside tied to playoff narrative spikes.',
    tags: ['nba', 'giannis', 'prizm', 'deep-space', 'insert'],
  }),
  createCard({
    id: 'card-33',
    playerName: 'Bryce Harper',
    team: 'Philadelphia Phillies',
    sport: 'MLB',
    set: '2023 Panini Prizm',
    parallel: 'Red White & Blue Parallel',
    year: 2023,
    cardNumber: '56',
    condition: 'Raw',
    currentPrice: 68,
    historyProfile: 'volatile',
    phase: 33,
    image: '/cards/harper-prizm-red-white-blue.jpg',
    psaPop: { '10': 442, '9': 1004, '8': 298 },
    listings: [
      { platform: 'eBay', seller: 'slabnation', price: 63, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 65, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'cardvault99', price: 71, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 74, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Harper Red White & Blue carries visual appeal and team-market affinity that keeps demand resilient. The card has shown mixed short-term movement but healthy transaction flow. It is a practical mid-tier parallel for collectors targeting star names without oversized entry costs.',
    tags: ['mlb', 'harper', 'prizm', 'red-white-blue', 'parallel', 'phillies'],
  }),
  createCard({
    id: 'card-34',
    playerName: 'Lamar Jackson',
    team: 'Baltimore Ravens',
    sport: 'NFL',
    set: '2023 Panini Prizm',
    parallel: 'Base',
    year: 2023,
    cardNumber: '77',
    condition: 'Raw',
    currentPrice: 62,
    historyProfile: 'stable',
    phase: 34,
    image: '/cards/jackson-prizm-2023.jpg',
    psaPop: { '10': 1322, '9': 3098, '8': 1002 },
    listings: [
      { platform: 'eBay', seller: 'card_investor_22', price: 58, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 60, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 64, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 61, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      "Jackson's 2023 Prizm base behaves like a high-liquidity veteran QB card with stable comp visibility. Month-to-month volatility has been limited, making entries more about condition quality than timing. This is a strong portfolio stabilizer in NFL-heavy watchlists.",
    tags: ['nfl', 'jackson', 'prizm', 'base', 'ravens', 'quarterback'],
  }),
  createCard({
    id: 'card-35',
    playerName: 'Nikola Jokic',
    team: 'Denver Nuggets',
    sport: 'NBA',
    set: '2023-24 Panini Mosaic',
    parallel: 'Base',
    year: 2023,
    cardNumber: '132',
    condition: 'Raw',
    currentPrice: 58,
    historyProfile: 'stable',
    phase: 35,
    image: '/cards/jokic-mosaic-2023.jpg',
    psaPop: { '10': 1195, '9': 2755, '8': 842 },
    listings: [
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 54, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 56, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabkings', price: 61, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 58, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Jokic Mosaic base has become a quiet outperformer as collectors broaden beyond flashier insert-only allocations. The card has posted steady prints with low drawdown characteristics over the past month. It fits best as a value-efficient MVP exposure card.',
    tags: ['nba', 'jokic', 'mosaic', 'base', 'nuggets'],
  }),
  createCard({
    id: 'card-36',
    playerName: 'Aaron Judge',
    team: 'New York Yankees',
    sport: 'MLB',
    set: '2023 Topps Chrome',
    parallel: 'Base',
    year: 2023,
    cardNumber: '99',
    condition: 'Raw',
    currentPrice: 35,
    historyProfile: 'stable',
    phase: 36,
    image: '/cards/judge-topps-chrome-2023.jpg',
    psaPop: { '10': 864, '9': 2011, '8': 623 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 32, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 33, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 37, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Judge Topps Chrome base is a low-cost gateway into one of baseball’s most recognizable active stars. Pricing has stayed contained, making this card more useful for steady comp tracking than aggressive upside speculation. It works as a liquid bench position in larger MLB portfolios.',
    tags: ['mlb', 'judge', 'topps-chrome', 'base', 'yankees'],
  }),
  createCard({
    id: 'card-37',
    playerName: 'Kawhi Leonard',
    team: 'LA Clippers',
    sport: 'NBA',
    set: '2020-21 Panini Prizm',
    parallel: 'Base',
    year: 2020,
    cardNumber: '203',
    condition: 'Raw',
    currentPrice: 32,
    historyProfile: 'stable',
    phase: 37,
    image: '/cards/kawhi-prizm-2020.jpg',
    psaPop: { '10': 792, '9': 1804, '8': 584 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 29, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 31, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 34, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Kawhi Prizm base offers value exposure to a proven postseason performer at a relatively low cost basis. Recent pricing has remained muted, which can appeal to collectors focused on downside discipline. It is best viewed as a contrarian veteran hold rather than momentum trade.',
    tags: ['nba', 'kawhi', 'prizm', 'base', 'clippers'],
  }),
  createCard({
    id: 'card-38',
    playerName: 'Travis Kelce',
    team: 'Kansas City Chiefs',
    sport: 'NFL',
    set: '2020 Donruss Optic',
    parallel: 'Base',
    year: 2020,
    cardNumber: '163',
    condition: 'Raw',
    currentPrice: 48,
    historyProfile: 'stable',
    phase: 38,
    image: '/cards/kelce-optic-2020.jpg',
    psaPop: { '10': 744, '9': 1716, '8': 522 },
    listings: [
      { platform: 'eBay', seller: 'cardvault99', price: 44, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 46, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabkings', price: 51, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 47, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Kelce Optic base remains one of the more reliable veteran tight-end cards due to sustained Chiefs fan demand. Price action has been stable and easy to comp, reducing execution risk for active flipping. It is a practical depth card for NFL set builders.',
    tags: ['nfl', 'kelce', 'optic', 'base', 'chiefs'],
  }),
  createCard({
    id: 'card-39',
    playerName: 'Travis Kelce',
    team: 'Kansas City Chiefs',
    sport: 'NFL',
    set: '2023 Donruss Optic',
    parallel: 'Diamond Kings Insert',
    year: 2023,
    cardNumber: 'DK-TK',
    condition: 'Raw',
    currentPrice: 78,
    historyProfile: 'volatile',
    phase: 39,
    image: '/cards/kelce-optic-diamond-hands.jpg',
    psaPop: { '10': 338, '9': 781, '8': 238 },
    listings: [
      { platform: 'eBay', seller: 'topslabs_cards', price: 73, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 82, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 79, condition: 'Raw NM-MT', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 75, condition: 'Raw', url: '#' },
    ],
    aiInsight:
      'Diamond Kings inserts for high-profile veterans can outperform base cards when visual design resonates with collectors. Kelce’s market has shown moderate swings, but inserts tend to keep stronger premiums in key football windows. This card offers a blend of brand familiarity and insert scarcity.',
    tags: ['nfl', 'kelce', 'optic', 'diamond-kings', 'insert'],
  }),
  createCard({
    id: 'card-40',
    playerName: 'Damian Lillard',
    team: 'Milwaukee Bucks',
    sport: 'NBA',
    set: '2021-22 Donruss Optic',
    parallel: 'Base',
    year: 2021,
    cardNumber: '74',
    condition: 'Raw',
    currentPrice: 35,
    historyProfile: 'stable',
    phase: 40,
    image: '/cards/lillard-optic-2021.jpg',
    psaPop: { '10': 821, '9': 1897, '8': 605 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 32, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 33, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 37, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Lillard Optic base is currently priced as a stable veteran asset with limited speculative premium. Month-long movement has been contained, creating straightforward entry/exit zones. It is an efficient card for collectors focused on low-cost star diversification.',
    tags: ['nba', 'lillard', 'optic', 'base', 'bucks'],
  }),
  createCard({
    id: 'card-41',
    playerName: 'Damian Lillard',
    team: 'Milwaukee Bucks',
    sport: 'NBA',
    set: '2023-24 Donruss Optic',
    parallel: 'Splash Insert',
    year: 2023,
    cardNumber: 'SP-DL',
    condition: 'Raw',
    currentPrice: 72,
    historyProfile: 'volatile',
    phase: 41,
    image: '/cards/lillard-optic-splash.jpg',
    psaPop: { '10': 301, '9': 712, '8': 226 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 68, condition: 'Raw NM', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 76, condition: 'PSA 9', url: '#' },
      { platform: 'eBay', seller: 'card_investor_22', price: 73, condition: 'Raw NM-MT', url: '#' },
      { platform: 'COMC', seller: 'rookiewatch_shop', price: 70, condition: 'Raw', url: '#' },
    ],
    aiInsight:
      'Splash inserts retain strong visual-brand appeal and typically outperform plain base equivalents in active NBA markets. Lillard’s card has shown moderate volatility, creating tactical buying windows on pullbacks. It’s a strong crossover piece for collectors mixing set-building with upside hunting.',
    tags: ['nba', 'lillard', 'optic', 'splash', 'insert'],
  }),
  createCard({
    id: 'card-42',
    playerName: 'Kyle Schwarber',
    team: 'Philadelphia Phillies',
    sport: 'MLB',
    set: '2023 Topps',
    parallel: 'Base',
    year: 2023,
    cardNumber: '201',
    condition: 'Raw',
    currentPrice: 12,
    historyProfile: 'stable',
    phase: 42,
    image: '/cards/schwarber-topps-2023.jpg',
    psaPop: { '10': 968, '9': 2245, '8': 684 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 10, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 11, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'premiumbreaks', price: 13, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Schwarber Topps base is a low-ticket, high-liquidity card for Phillies collectors and team set builders. Price movement has been minimal, which is typical for dependable veteran base issues. It serves best as a low-volatility portfolio filler with steady buyer demand.',
    tags: ['mlb', 'schwarber', 'topps', 'base', 'phillies'],
  }),
  createCard({
    id: 'card-43',
    playerName: 'Juan Soto',
    team: 'New York Yankees',
    sport: 'MLB',
    set: '2023 Topps',
    parallel: 'Base',
    year: 2023,
    cardNumber: '188',
    condition: 'Raw',
    currentPrice: 28,
    historyProfile: 'stable',
    phase: 43,
    image: '/cards/soto-topps-2023.jpg',
    psaPop: { '10': 1117, '9': 2512, '8': 776 },
    listings: [
      { platform: 'eBay', seller: 'card_investor_22', price: 25, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 26, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 30, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 27, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Soto Topps base has tightened up as market attention shifted to team-change narrative and long-term bat profile. The card remains highly liquid in low-to-mid dollar bins with frequent comps. It is a practical accumulation candidate for conservative MLB exposure.',
    tags: ['mlb', 'soto', 'topps', 'base', 'yankees'],
  }),
  createCard({
    id: 'card-44',
    playerName: 'Juan Soto',
    team: 'New York Yankees',
    sport: 'MLB',
    set: '2024 Topps Chrome',
    parallel: 'Base',
    year: 2024,
    cardNumber: '77',
    condition: 'Raw',
    currentPrice: 45,
    historyProfile: 'uptrend',
    phase: 44,
    image: '/cards/soto-topps-chrome-2024.jpg',
    psaPop: { '10': 1022, '9': 2378, '8': 731 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 42, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 43, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 47, condition: 'PSA 9', url: '#' },
      { platform: 'PWCC', seller: 'Weekly Vault', price: 49, condition: 'PSA 10', url: '#' },
    ],
    aiInsight:
      'Soto Topps Chrome has shown a gentle upward bias with increasing visibility among Yankees-focused collectors. Chrome liquidity and grading familiarity help maintain strong market depth at this price tier. This card offers upside with manageable risk compared with rarer parallels.',
    tags: ['mlb', 'soto', 'topps-chrome', 'base', 'yankees'],
  }),
  createCard({
    id: 'card-45',
    playerName: 'Fernando Tatis Jr.',
    team: 'San Diego Padres',
    sport: 'MLB',
    set: '2023 Topps',
    parallel: 'Base',
    year: 2023,
    cardNumber: '134',
    condition: 'Raw',
    currentPrice: 22,
    historyProfile: 'volatile',
    phase: 45,
    image: '/cards/tatis-topps-2023.jpg',
    psaPop: { '10': 935, '9': 2168, '8': 648 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 20, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 21, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 23, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Tatis Topps base can move in bursts around performance runs, giving it a more volatile profile than many veteran base cards. Current levels are near the center of the recent range, which keeps risk balanced for swing traders. It is a useful tactical card in active MLB watchlists.',
    tags: ['mlb', 'tatis', 'topps', 'base', 'padres'],
  }),
  createCard({
    id: 'card-46',
    playerName: 'Fernando Tatis Jr.',
    team: 'San Diego Padres',
    sport: 'MLB',
    set: '2024 Topps',
    parallel: 'Base',
    year: 2024,
    cardNumber: '88',
    condition: 'Raw',
    currentPrice: 25,
    historyProfile: 'volatile',
    phase: 46,
    image: '/cards/tatis-topps-2024.jpg',
    psaPop: { '10': 977, '9': 2235, '8': 672 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 23, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 24, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'slabnation', price: 27, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'card_investor_22', price: 25, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      '2024 Topps gives Tatis collectors a refreshed flagship entry with more liquidity than niche inserts. The card’s movement has been mixed, creating frequent micro-opportunities for disciplined entries. This profile suits collectors who want tradable upside without high ticket risk.',
    tags: ['mlb', 'tatis', 'topps', 'base', 'padres', '2024'],
  }),
  createCard({
    id: 'card-47',
    playerName: 'Mike Trout',
    team: 'Los Angeles Angels',
    sport: 'MLB',
    set: '2024 Topps',
    parallel: 'Base',
    year: 2024,
    cardNumber: '45',
    condition: 'Raw',
    currentPrice: 30,
    historyProfile: 'stable',
    phase: 47,
    image: '/cards/trout-topps-2024.jpg',
    psaPop: { '10': 1085, '9': 2442, '8': 756 },
    listings: [
      { platform: 'eBay', seller: 'cardvault99', price: 27, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 28, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'topslabs_cards', price: 32, condition: 'PSA 9', url: '#' },
      { platform: 'COMC', seller: 'premiumbreaks', price: 29, condition: 'Raw NM', url: '#' },
    ],
    aiInsight:
      'Trout flagship Topps base continues to attract broad collector demand despite lower headline momentum than earlier career peaks. Stable month-over-month movement makes this card easy to price and trade. It is a dependable blue-chip MLB veteran position in budget-conscious portfolios.',
    tags: ['mlb', 'trout', 'topps', 'base', 'angels'],
  }),
  createCard({
    id: 'card-48',
    playerName: 'Trea Turner',
    team: 'Philadelphia Phillies',
    sport: 'MLB',
    set: '2024 Topps',
    parallel: 'Base',
    year: 2024,
    cardNumber: '122',
    condition: 'Raw',
    currentPrice: 15,
    historyProfile: 'stable',
    phase: 48,
    image: '/cards/turner-topps-2024.jpg',
    psaPop: { '10': 884, '9': 2055, '8': 611 },
    listings: [
      { platform: 'eBay', seller: 'thehobbybox', price: 13, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 14, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'premiumbreaks', price: 16, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Turner Topps base sits in a low-price, high-liquidity lane that can be useful for set completers and team collectors. Recent pricing has been steady with minimal drawdowns. It is an efficient filler card for maintaining broad Phillies coverage.',
    tags: ['mlb', 'turner', 'topps', 'base', 'phillies'],
  }),
  createCard({
    id: 'card-49',
    playerName: 'Christian Yelich',
    team: 'Milwaukee Brewers',
    sport: 'MLB',
    set: '2023 Topps',
    parallel: 'Base',
    year: 2023,
    cardNumber: '173',
    condition: 'Raw',
    currentPrice: 10,
    historyProfile: 'stable',
    phase: 49,
    image: '/cards/yelich-topps-2023.jpg',
    psaPop: { '10': 812, '9': 1897, '8': 566 },
    listings: [
      { platform: 'eBay', seller: 'card_investor_22', price: 9, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'thehobbybox', price: 9, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'cardvault99', price: 11, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'Yelich Topps base is a classic low-ticket veteran card with easy entry and frequent listing turnover. Minimal month-over-month volatility keeps this card predictable for set-focused buyers. It is best used as a low-risk roster completer rather than an alpha generator.',
    tags: ['mlb', 'yelich', 'topps', 'base', 'brewers'],
  }),
  createCard({
    id: 'card-50',
    playerName: 'Christian Yelich',
    team: 'Milwaukee Brewers',
    sport: 'MLB',
    set: '2024 Topps',
    parallel: 'Base',
    year: 2024,
    cardNumber: '176',
    condition: 'Raw',
    currentPrice: 12,
    historyProfile: 'stable',
    phase: 50,
    image: '/cards/yelich-topps-2024.jpg',
    psaPop: { '10': 828, '9': 1944, '8': 584 },
    listings: [
      { platform: 'eBay', seller: 'premiumbreaks', price: 10, condition: 'Raw NM', url: '#' },
      { platform: 'COMC', seller: 'cardvault99', price: 11, condition: 'Raw', url: '#' },
      { platform: 'eBay', seller: 'rookiewatch_shop', price: 13, condition: 'PSA 9', url: '#' },
    ],
    aiInsight:
      'The 2024 Yelich Topps base tracks similarly to 2023 with stable, low-volatility movement and frequent low-dollar comps. This makes it useful for completion-focused collectors managing broad checklist exposure. It is a practical utility card in value-first MLB builds.',
    tags: ['mlb', 'yelich', 'topps', 'base', 'brewers', '2024'],
  }),
]

export default cards
