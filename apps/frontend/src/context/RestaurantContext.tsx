"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Restaurant {
  id: number;
  name: string;
  ownerId: string;
}

interface Role {
  id: number;
  name: string;
  canCreateRoles: boolean;
  canManageSlots: boolean;
  canManageStaff: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  canManageTables: boolean;
}

interface UserRestaurant {
  id: number;
  userId: string;
  restaurantId: number;
  roleId: number;
  restaurant: Restaurant;
  role: Role;
}

interface RestaurantContextType {
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;
  userRestaurants: UserRestaurant[];
  setUserRestaurants: (restaurants: UserRestaurant[]) => void;
  selectedRestaurant: UserRestaurant | null;
}

const RestaurantContext = createContext<RestaurantContextType>({
  selectedRestaurantId: null,
  setSelectedRestaurantId: () => {},
  userRestaurants: [],
  setUserRestaurants: () => {},
  selectedRestaurant: null,
});

export const useRestaurant = () => useContext(RestaurantContext);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [userRestaurants, setUserRestaurants] = useState<UserRestaurant[]>([]);

  // Compute the selected restaurant object based on the ID
  const selectedRestaurant =
    userRestaurants.find(
      (r) => String(r.restaurant.id) === selectedRestaurantId
    ) || null;

  return (
    <RestaurantContext.Provider
      value={{
        selectedRestaurantId,
        setSelectedRestaurantId,
        userRestaurants,
        setUserRestaurants,
        selectedRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};
