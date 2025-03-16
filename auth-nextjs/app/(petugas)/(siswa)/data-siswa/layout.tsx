// app/layout.tsx
import { SocketProvider } from "@/lib/socketContext";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <SocketProvider>{children}</SocketProvider>
    </div>
  );
};

export default Layout;
