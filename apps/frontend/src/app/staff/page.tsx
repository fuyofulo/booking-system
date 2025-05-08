import React from "react";

export default function StaffPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Staff Management</h1>

      <div className="mb-8 flex justify-between items-center">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Add Staff Member
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md">
            Schedule
          </button>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search staff..."
            className="px-4 py-2 border border-gray-300 rounded-md w-64"
          />
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        James Wilson
                      </div>
                      <div className="text-sm text-gray-500">
                        james.wilson@example.com
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">Manager</td>
                <td className="px-6 py-4 whitespace-nowrap">(555) 123-4567</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  9:00 AM - 5:00 PM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-gray-600 hover:text-gray-900">
                    View
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Maria Garcia
                      </div>
                      <div className="text-sm text-gray-500">
                        maria.garcia@example.com
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">Chef</td>
                <td className="px-6 py-4 whitespace-nowrap">(555) 987-6543</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  12:00 PM - 9:00 PM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-gray-600 hover:text-gray-900">
                    View
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Robert Chen
                      </div>
                      <div className="text-sm text-gray-500">
                        robert.chen@example.com
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">Server</td>
                <td className="px-6 py-4 whitespace-nowrap">(555) 234-5678</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Off
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-gray-600 hover:text-gray-900">
                    View
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Sophia Martinez
                      </div>
                      <div className="text-sm text-gray-500">
                        sophia.martinez@example.com
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">Host</td>
                <td className="px-6 py-4 whitespace-nowrap">(555) 876-5432</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  4:00 PM - 11:00 PM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button className="text-gray-600 hover:text-gray-900">
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Weekly Schedule</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center">
                <div className="text-sm font-medium mb-2">{day}</div>
                <div className="bg-gray-100 rounded p-2 h-32 overflow-y-auto">
                  <div className="text-xs bg-blue-100 rounded p-1 mb-1">
                    James (9-5)
                  </div>
                  <div className="text-xs bg-green-100 rounded p-1 mb-1">
                    Maria (12-9)
                  </div>
                  <div className="text-xs bg-purple-100 rounded p-1 mb-1">
                    Sophia (4-11)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
