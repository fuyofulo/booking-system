import React from "react";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Restaurant Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Orders</h2>
          <div className="text-3xl font-bold">24</div>
          <div className="text-sm text-gray-500 mt-2">+12% from yesterday</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Total Revenue</h2>
          <div className="text-3xl font-bold">$1,248.42</div>
          <div className="text-sm text-gray-500 mt-2">+8% from yesterday</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Active Tables</h2>
          <div className="text-3xl font-bold">14/20</div>
          <div className="text-sm text-gray-500 mt-2">70% occupancy</div>
        </div>
      </div>
    </div>
  );
}
