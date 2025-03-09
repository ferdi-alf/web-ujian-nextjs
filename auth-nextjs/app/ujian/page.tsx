import CardName from "@/components/card-name";
import UjianPage from "./pageClient";

export default function Ujian() {
  return (
    <div className="mt-16 w-full ">
      <div className="w-full flex h-screen justify-center items-center">
        <UjianPage>
          <CardName />
        </UjianPage>
      </div>
    </div>
  );
}
