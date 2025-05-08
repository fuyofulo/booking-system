import React from "react";

export default function OrdersPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Orders Management</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
              New Order
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-md">
              Filter
            </button>
          </div>
          <div>
            <input
              type="text"
              placeholder="Search orders..."
              className="px-4 py-2 border border-gray-300 rounded-md w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Sample order rows */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">#1234</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 5</td>
                <td className="px-6 py-4 whitespace-nowrap">10:30 AM</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Completed
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">$45.50</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900">
                    View
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">#1235</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 3</td>
                <td className="px-6 py-4 whitespace-nowrap">10:42 AM</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    In Progress
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">$78.25</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900">
                    View
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">#1236</td>
                <td className="px-6 py-4 whitespace-nowrap">Table 8</td>
                <td className="px-6 py-4 whitespace-nowrap">11:15 AM</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">$32.80</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900">
                    View
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
