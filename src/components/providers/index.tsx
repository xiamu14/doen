import { ThemeProvider } from "@/components/theme/provider";
import QueryProvider from "./query";
import { Toaster } from "sonner";

export default function RootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster toastOptions={{ style: { paddingLeft: 30, paddingRight: 30 } }} />
      </ThemeProvider>
    </QueryProvider>
  );
}
