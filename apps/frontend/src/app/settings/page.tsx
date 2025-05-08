import React from "react";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-medium">Restaurant Information</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="La Bistro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="contact@labistro.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="www.labistro.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              defaultValue="123 Restaurant Lane, Foodville, CA 90210"
            />
          </div>

          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-medium">Operating Hours</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-700">
                    {day}
                  </span>
                </div>
                <div className="flex-1 flex items-center space-x-2">
                  <input
                    type="time"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="09:00"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="22:00"
                  />
                </div>
                <div>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600"
                      defaultChecked={day !== "Sunday"}
                    />
                    <span className="ml-2 text-sm text-gray-700">Open</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-medium">Notifications</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Email Notifications
                </h3>
                <p className="text-sm text-gray-500">
                  Receive email notifications for new orders
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="toggle1"
                  className="sr-only"
                  defaultChecked
                />
                <label
                  htmlFor="toggle1"
                  className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                ></label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  SMS Notifications
                </h3>
                <p className="text-sm text-gray-500">
                  Receive text messages for new reservations
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="toggle2"
                  className="sr-only"
                  defaultChecked
                />
                <label
                  htmlFor="toggle2"
                  className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                ></label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Daily Reports
                </h3>
                <p className="text-sm text-gray-500">
                  Receive daily sales and activity reports
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input type="checkbox" id="toggle3" className="sr-only" />
                <label
                  htmlFor="toggle3"
                  className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                ></label>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
