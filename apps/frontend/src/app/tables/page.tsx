import React from "react";

export default function TablesPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Tables & Reservations</h1>

      <div className="mb-8 flex justify-between items-center">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Add Reservation
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md">
            Manage Tables
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Occupied</span>
          </div>
        </div>
      </div>

      {/* Floor plan */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Floor Plan</h2>
        <div className="border border-gray-200 p-4 rounded bg-gray-50 h-96 relative">
          {/* Table representations */}
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-green-200 flex items-center justify-center border-2 border-green-500 cursor-pointer">
            <span className="font-semibold">T1</span>
          </div>
          <div className="absolute top-10 left-40 w-20 h-20 rounded-full bg-yellow-200 flex items-center justify-center border-2 border-yellow-500 cursor-pointer">
            <span className="font-semibold">T2</span>
          </div>
          <div className="absolute top-10 left-70 w-20 h-20 rounded-full bg-red-200 flex items-center justify-center border-2 border-red-500 cursor-pointer">
            <span className="font-semibold">T3</span>
          </div>
          <div className="absolute top-40 left-10 w-20 h-20 rounded-full bg-green-200 flex items-center justify-center border-2 border-green-500 cursor-pointer">
            <span className="font-semibold">T4</span>
          </div>
          <div className="absolute top-40 left-40 w-20 h-20 rounded-full bg-green-200 flex items-center justify-center border-2 border-green-500 cursor-pointer">
            <span className="font-semibold">T5</span>
          </div>
          <div className="absolute top-40 left-70 w-20 h-20 rounded-full bg-red-200 flex items-center justify-center border-2 border-red-500 cursor-pointer">
            <span className="font-semibold">T6</span>
          </div>
        </div>
      </div>

      {/* Today's Reservations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Today's Reservations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">12:30 PM</td>
                <td className="px-6 py-4 whitespace-nowrap">John Smith</td>
                <td className="px-6 py-4 whitespace-nowrap">4</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 2</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Reserved
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    Cancel
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">1:00 PM</td>
                <td className="px-6 py-4 whitespace-nowrap">Emily Johnson</td>
                <td className="px-6 py-4 whitespace-nowrap">2</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 3</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Seated
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-green-600 hover:text-green-900">
                    Complete
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">2:15 PM</td>
                <td className="px-6 py-4 whitespace-nowrap">Michael Brown</td>
                <td className="px-6 py-4 whitespace-nowrap">6</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 6</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Seated
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-green-600 hover:text-green-900">
                    Complete
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">5:30 PM</td>
                <td className="px-6 py-4 whitespace-nowrap">Sarah Miller</td>
                <td className="px-6 py-4 whitespace-nowrap">3</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 4</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Confirmed
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
