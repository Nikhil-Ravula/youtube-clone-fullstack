import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  let currentTheme: ToasterProps["theme"] = "system"
  try {
    const { theme = "system" } = useTheme()
    currentTheme = theme as ToasterProps["theme"]
  } catch (e) {
    // next-themes context not present
  }

  return (
    <Sonner
      theme={currentTheme}
      className="toaster group"
      closeButton={true}
      duration={3000}
      visibleToasts={3}
      toastOptions={{
        duration: 3000,
        closeButton: true,
      }}
      {...props}
    />
  )
}

export { Toaster }
