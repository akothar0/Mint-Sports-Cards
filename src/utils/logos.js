const PLACEHOLDER_LOGO = '/placeholders/logo.svg'

const TEAM_LOGOS = {}
const LEAGUE_LOGOS = {}

export function getTeamLogo(teamName) {
  return TEAM_LOGOS[teamName] ?? PLACEHOLDER_LOGO
}

export function getLeagueLogo(sport) {
  return LEAGUE_LOGOS[sport] ?? PLACEHOLDER_LOGO
}
