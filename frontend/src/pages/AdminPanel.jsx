import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClasses = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Assuming this endpoint fetches all classes for admin
                const response = await fetch(`http://localhost:5000/api/classes?email=${encodeURIComponent(user.email)}&status=${encodeURIComponent(user.status)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch classes.');
                }
                const data = await response.json();
                setClasses(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, [user]);

    return (
        <div className="w-screen flex">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100 min-h-screen">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Panel: Class Overview</h1>

                {loading && <p>Loading classes...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {!loading && !error && (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full leading-normal">
                            <thead>
                                <tr>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Class ID
                                    </th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Format
                                    </th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Registered
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {classes.map((cls) => (
                                    <tr key={cls.class_id}>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <p className="text-gray-900 whitespace-no-wrap">{cls.class_id}</p>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <p className="text-gray-900 whitespace-no-wrap">{cls.title}</p>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <span
                                                className={`relative inline-block px-3 py-1 font-semibold leading-tight ${
                                                    cls.format === 'ONLINE'
                                                        ? 'text-green-900'
                                                        : 'text-blue-900'
                                                }`}
                                            >
                                                <span
                                                    aria-hidden
                                                    className={`absolute inset-0 ${
                                                        cls.format === 'ONLINE'
                                                            ? 'bg-green-200'
                                                            : 'bg-blue-200'
                                                    } opacity-50 rounded-full`}
                                                ></span>
                                                <span className="relative">{cls.format}</span>
                                            </span>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <p className="text-gray-900 whitespace-no-wrap">
                                                {new Date(cls.start_date).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <p className="text-gray-900 whitespace-no-wrap">
                                                {JSON.parse(cls.registered_users || '[]').length} / {cls.max_participants === 999 ? '∞' : cls.max_participants}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
