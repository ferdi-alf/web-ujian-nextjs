// Dashboard.tsx (server component)
import { auth } from "@/auth";
import CardAdmin from "@/components/card/card-admin";
import { ClientWrapper } from "./ClientWrapper"; // Sesuaikan path import
import { SocketProvider } from "@/lib/socketContext";

const Dashboard = async () => {
  const session = await auth();
  console.log(session);

  return (
    <div className="w-full">
      <div className="w-full grid gap-5 lg:grid-cols-4 grid-cols-2">
        <SocketProvider>
          <CardAdmin />
        </SocketProvider>
      </div>
      <div className="w-full mt-10 grid lg:grid-cols-2 grid-cols-1 gap-4">
        <ClientWrapper />
      </div>
    </div>
  );
};

export default Dashboard;
