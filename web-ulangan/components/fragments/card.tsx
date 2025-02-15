interface CardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>; // Bisa juga didefinisikan lebih spesifik jika ikon adalah komponen tertentu
  data: string | number;
  description: string;
}

const Card: React.FC<CardProps> = ({
  title,
  icon: Icon,
  data,
  description,
}) => {
  return (
    <div className=" bg-white border border-gray-300 p-3 rounded-md">
      <div className="flex justify-between">
        <p className="font-semibold sm:text-lg text-sm">{title}</p>
        <Icon className="text-gray-400" />
      </div>
      <div className="flex flex-col mt-4">
        <p className="font-bold text-xl">{data}</p>
        <p className="font-light">{description}</p>
      </div>
    </div>
  );
};

export default Card;
