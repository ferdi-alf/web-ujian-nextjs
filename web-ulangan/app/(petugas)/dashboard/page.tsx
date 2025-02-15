import { auth } from "@/auth";
import CardAdmin from "@/components/card/card-admin";
import { CardPemantau } from "@/components/card/card-pemantau";
import { ChartDashboard } from "@/components/chart/chart-dashoard";

const Dashboard = async () => {
  const session = await auth();
  console.log(session);
  return (
    <div className=" w-full ">
      <div className="w-full grid gap-5 lg:grid-cols-4 grid-cols-2">
        <CardAdmin />
      </div>
      <div className="w-full mt-10 grid lg:grid-cols-2 grid-cols-1 gap-4">
        <ChartDashboard />
        <CardPemantau />
      </div>
    </div>
  );
};

export default Dashboard;
