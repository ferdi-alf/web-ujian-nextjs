import ModalInputUsers from "@/components/dialog/ModalInputUsers";
import DataUsers from "@/components/table/data-user";

const UserPage = () => {
  return (
    <div className="w-full flex justify-center flex-col">
      <ModalInputUsers />
      <DataUsers />
    </div>
  );
};

export default UserPage;
