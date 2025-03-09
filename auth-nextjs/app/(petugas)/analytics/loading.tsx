const Loading = () => {
  return (
    <div
      role="status"
      className="w-full p-4  border-gray-200  flex justify-evenly gap-3 divide-gray-200 rounded-sm shadow-sm animate-pulse "
    >
      <div
        role="status"
        className="max-w-sm p-4 border w-full  border-gray-200 rounded-sm shadow-sm animate-pulse md:p-6 "
      >
        <div className="h-2.5 bg-gray-200 rounded-full  w-full mb-2.5"></div>
        <div className="w-full h-2 mb-10 bg-gray-200 rounded-full "></div>
        <div className="flex items-baseline mt-4">
          <div className="w-full bg-gray-200 rounded-t-lg h-72 "></div>
          <div className="w-full h-56 ms-6 bg-gray-200 rounded-t-lg "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-72 ms-6 "></div>
          <div className="w-full h-64 ms-6 bg-gray-200 rounded-t-lg "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-80 ms-6 "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-72 ms-6 "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-80 ms-6 "></div>
        </div>
        <span className="sr-only">Loading...</span>
      </div>

      <div
        role="status"
        className="max-w-sm p-4 border w-full  border-gray-200 rounded-sm shadow-sm animate-pulse md:p-6 "
      >
        <div className="h-2.5 bg-gray-200 rounded-full  w-full mb-2.5"></div>
        <div className="w-full h-2 mb-10 bg-gray-200 rounded-full "></div>
        <div className="flex items-baseline mt-4">
          <div className="w-full bg-gray-200 rounded-t-lg h-72 "></div>
          <div className="w-full h-56 ms-6 bg-gray-200 rounded-t-lg "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-72 ms-6 "></div>
          <div className="w-full h-64 ms-6 bg-gray-200 rounded-t-lg "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-80 ms-6 "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-72 ms-6 "></div>
          <div className="w-full bg-gray-200 rounded-t-lg h-80 ms-6 "></div>
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};
export default Loading;
