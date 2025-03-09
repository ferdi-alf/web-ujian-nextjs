import { getUsers } from "@/lib/data";

const UserTable = async () => {
  const users = await getUsers();
  console.log(users);

  if (!users?.length) return <h1 className="text-2xl">No User Found</h1>;
  return (
    <table className="w-full bg-white mt-3 shadow-md">
      <thead className="border-b border-gray-100">
        <tr>
          <th className="py-3 px-6 text-left text-sm">Username</th>
          <th className="py-3 px-6 text-left text-sm">Role</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="py-3 px-6">{user.username}</td>
            <td className="py-3 px-6">{user.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;
