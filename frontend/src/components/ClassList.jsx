const mockClasses = [
  // { id: 1, title: "การใช้งานฐานข้อมูลออนไลน์", date: "2025-08-01" },
  // { id: 2, title: "แนะนำบริการห้องสมุด AMS", date: "2025-08-15" },
  // { id: 3, title: "การเขียนอ้างอิงด้วย EndNote", date: "2025-09-05" },
];

const ClassList = () => {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    setClasses(mockClasses);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">รายการคลาสอบรม</h2>
      <ul className="space-y-4">
        {classes.map((cls) => (
          <li key={cls.id} className="border p-4 rounded shadow">
            <h3 className="text-lg font-semibold">{cls.title}</h3>
            <p className="text-sm text-gray-600">วันที่: {cls.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClassList;
