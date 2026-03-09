import { useAppContext } from '../context/AppContext'

export function ToastContainer() {
  const { toasts } = useAppContext()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
