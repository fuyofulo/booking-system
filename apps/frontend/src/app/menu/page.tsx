import React from "react";

export default function MenuPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Menu Management</h1>

      <div className="mb-8 flex justify-between items-center">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Add Menu Item
          </button>
          <div className="relative">
            <button className="px-4 py-2 border border-gray-300 rounded-md">
              Categories
            </button>
          </div>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search menu items..."
            className="px-4 py-2 border border-gray-300 rounded-md w-64"
          />
        </div>
      </div>

      {/* Menu Categories */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Appetizers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Menu Item Card */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">Bruschetta</h3>
                <span className="text-green-600 font-medium">$8.99</span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                Toasted bread topped with tomatoes, garlic, olive oil and basil
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">Available</span>
                <div className="flex space-x-2">
                  <button className="p-1 text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                  <button className="p-1 text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">Mozzarella Sticks</h3>
                <span className="text-green-600 font-medium">$7.99</span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                Breaded mozzarella cheese, fried until golden and crispy, served
                with marinara
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">Available</span>
                <div className="flex space-x-2">
                  <button className="p-1 text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                  <button className="p-1 text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Main Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">Grilled Salmon</h3>
                <span className="text-green-600 font-medium">$22.99</span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                Fresh Atlantic salmon grilled to perfection, served with
                seasonal vegetables
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">Available</span>
                <div className="flex space-x-2">
                  <button className="p-1 text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                  <button className="p-1 text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">Chicken Parmesan</h3>
                <span className="text-green-600 font-medium">$18.99</span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                Breaded chicken breast topped with marinara sauce and melted
                mozzarella
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">Available</span>
                <div className="flex space-x-2">
                  <button className="p-1 text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                  <button className="p-1 text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
