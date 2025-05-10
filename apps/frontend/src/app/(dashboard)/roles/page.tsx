"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import { ROLE_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, Settings, Check, X } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Role {
  id: number;
  name: string;
  canCreateRoles: boolean;
  canManageTables: boolean;
  canManageSlots: boolean;
  canManageStaff: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  restaurantId: number;
}

interface RolesResponse {
  message: string;
  roles: Role[];
}

export default function RolesPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updatedPermissions, setUpdatedPermissions] = useState<Partial<Role>>(
    {}
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    canCreateRoles: false,
    canManageTables: false,
    canManageSlots: false,
    canManageStaff: false,
    canManageMenu: false,
    canManageOrders: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchRoles = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${ROLE_URLS.GET_ROLES}/${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data: RolesResponse = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      addToast("Failed to load roles", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurant, addToast]);

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Role Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to manage roles
          </p>
        </div>
        <div className="grid grid-cols-1 px-6 py-4">
          <Card className="rounded-3xl bg-white text-black">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">
                No Restaurant Selected
              </h2>
              <p className="text-gray-600 mb-6">
                Select a restaurant from the dropdown in the sidebar to manage
                roles
              </p>
              <Button asChild className="bg-[#4a5842] hover:bg-[#4a5842]/90">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canManageRoles = selectedRestaurant.role.canCreateRoles;

  const handleEditClick = (role: Role) => {
    setEditingRole(role);
    setUpdatedPermissions({
      canCreateRoles: role.canCreateRoles,
      canManageTables: role.canManageTables,
      canManageSlots: role.canManageSlots,
      canManageStaff: role.canManageStaff,
      canManageMenu: role.canManageMenu,
      canManageOrders: role.canManageOrders,
    });
    setIsDialogOpen(true);
  };

  const handlePermissionToggle = (permission: keyof Role) => {
    setUpdatedPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !selectedRestaurant) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(ROLE_URLS.UPDATE_ROLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          roleId: editingRole.id,
          restaurantId: selectedRestaurant.restaurant.id,
          ...updatedPermissions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      // Update the roles list with the new permissions
      setRoles((prevRoles) =>
        prevRoles.map((role) =>
          role.id === editingRole.id ? { ...role, ...updatedPermissions } : role
        )
      );

      addToast("Role updated successfully", "success");
      setIsDialogOpen(false);
      setEditingRole(null);
    } catch (error) {
      console.error("Error updating role:", error);
      addToast("Failed to update role", "error");
    }
  };

  const handleCreateRoleToggle = (permission: keyof typeof newRole) => {
    setNewRole((prev) => ({ ...prev, [permission]: !prev[permission] }));
  };

  const handleCreateRole = async () => {
    if (!selectedRestaurant) return;
    if (!newRole.name.trim()) {
      addToast("Role name is required", "error");
      return;
    }
    setIsCreating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }
      const response = await fetch(ROLE_URLS.CREATE_ROLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          ...newRole,
          restaurantId: selectedRestaurant.restaurant.id,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create role");
      }
      addToast("Role created successfully", "success");
      setIsCreateDialogOpen(false);
      setNewRole({
        name: "",
        canCreateRoles: false,
        canManageTables: false,
        canManageSlots: false,
        canManageStaff: false,
        canManageMenu: false,
        canManageOrders: false,
      });
      // Refresh roles
      fetchRoles();
    } catch (error) {
      console.error("Error creating role:", error);
      addToast("Failed to create role", "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and add role button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Role Management</h1>
        </div>

        {canManageRoles && (
          <div className="mt-2 md:mt-0 w-full md:w-auto">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Role
            </Button>
          </div>
        )}
      </div>

      {/* Roles list */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-[#4a5842] text-white">
          <CardContent className="pb-6 px-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading roles...</p>
              </div>
            ) : roles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => (
                  <Card
                    key={role.id}
                    className="border-2 rounded-3xl overflow-hidden bg-white hover:bg-gray-50 transition-colors"
                  >
                    <CardHeader className="py-4 px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-[#4a5842]/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-[#4a5842]" />
                          </div>
                          <CardTitle className="text-base font-semibold text-black">
                            {role.name}
                          </CardTitle>
                        </div>
                        {canManageRoles && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditClick(role)}
                          >
                            <Settings className="h-4 w-4 text-[#4a5842]" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          {role.canCreateRoles ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            Manage Roles
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.canManageTables ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            Manage Tables
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.canManageSlots ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            Manage Slots
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.canManageStaff ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            Manage Staff
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.canManageMenu ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            Manage Menu
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.canManageOrders ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            Manage Orders
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No roles found</p>
                {canManageRoles && (
                  <Button
                    asChild
                    className="bg-[#4a5842] hover:bg-[#4a5842]/90"
                  >
                    <Link
                      href="/roles/add"
                      className="text-sm flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Role
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px] bg-white backdrop-blur-md"
          style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#4a5842]">
              Edit {editingRole?.name} Permissions
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manageRoles"
                  className="font-semibold text-base text-[#4a5842]"
                >
                  Manage Roles
                </Label>
                <Switch
                  id="manageRoles"
                  checked={updatedPermissions.canCreateRoles}
                  onCheckedChange={() =>
                    handlePermissionToggle("canCreateRoles")
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manageTables"
                  className="font-semibold text-base text-[#4a5842]"
                >
                  Manage Tables
                </Label>
                <Switch
                  id="manageTables"
                  checked={updatedPermissions.canManageTables}
                  onCheckedChange={() =>
                    handlePermissionToggle("canManageTables")
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manageSlots"
                  className="font-semibold text-base text-[#4a5842]"
                >
                  Manage Slots
                </Label>
                <Switch
                  id="manageSlots"
                  checked={updatedPermissions.canManageSlots}
                  onCheckedChange={() =>
                    handlePermissionToggle("canManageSlots")
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manageStaff"
                  className="font-semibold text-base text-[#4a5842]"
                >
                  Manage Staff
                </Label>
                <Switch
                  id="manageStaff"
                  checked={updatedPermissions.canManageStaff}
                  onCheckedChange={() =>
                    handlePermissionToggle("canManageStaff")
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manageMenu"
                  className="font-semibold text-base text-[#4a5842]"
                >
                  Manage Menu
                </Label>
                <Switch
                  id="manageMenu"
                  checked={updatedPermissions.canManageMenu}
                  onCheckedChange={() =>
                    handlePermissionToggle("canManageMenu")
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manageOrders"
                  className="font-semibold text-base text-[#4a5842]"
                >
                  Manage Orders
                </Label>
                <Switch
                  id="manageOrders"
                  checked={updatedPermissions.canManageOrders}
                  onCheckedChange={() =>
                    handlePermissionToggle("canManageOrders")
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <div className="flex justify-center gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-[#4a5842] text-[#4a5842] w-32"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                className="bg-[#4a5842] text-white hover:bg-[#3e4a36] w-32"
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      {canManageRoles && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent
            className="sm:max-w-[500px] bg-white backdrop-blur-md"
            style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)" }}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#4a5842]">
                Create New Role
              </DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <Label
                htmlFor="roleName"
                className="font-semibold text-base text-[#4a5842]"
              >
                Role Name
              </Label>
              <Input
                id="roleName"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-2 mb-2 bg-gray-100 border border-gray-300 text-black"
                placeholder="Enter role name"
                maxLength={32}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="createRoles"
                    className="font-semibold text-base text-[#4a5842]"
                  >
                    Manage Roles
                  </Label>
                  <Switch
                    id="createRoles"
                    checked={newRole.canCreateRoles}
                    onCheckedChange={() =>
                      handleCreateRoleToggle("canCreateRoles")
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="manageTables"
                    className="font-semibold text-base text-[#4a5842]"
                  >
                    Manage Tables
                  </Label>
                  <Switch
                    id="manageTables"
                    checked={newRole.canManageTables}
                    onCheckedChange={() =>
                      handleCreateRoleToggle("canManageTables")
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="manageSlots"
                    className="font-semibold text-base text-[#4a5842]"
                  >
                    Manage Slots
                  </Label>
                  <Switch
                    id="manageSlots"
                    checked={newRole.canManageSlots}
                    onCheckedChange={() =>
                      handleCreateRoleToggle("canManageSlots")
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="manageStaff"
                    className="font-semibold text-base text-[#4a5842]"
                  >
                    Manage Staff
                  </Label>
                  <Switch
                    id="manageStaff"
                    checked={newRole.canManageStaff}
                    onCheckedChange={() =>
                      handleCreateRoleToggle("canManageStaff")
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="manageMenu"
                    className="font-semibold text-base text-[#4a5842]"
                  >
                    Manage Menu
                  </Label>
                  <Switch
                    id="manageMenu"
                    checked={newRole.canManageMenu}
                    onCheckedChange={() =>
                      handleCreateRoleToggle("canManageMenu")
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="manageOrders"
                    className="font-semibold text-base text-[#4a5842]"
                  >
                    Manage Orders
                  </Label>
                  <Switch
                    id="manageOrders"
                    checked={newRole.canManageOrders}
                    onCheckedChange={() =>
                      handleCreateRoleToggle("canManageOrders")
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <div className="flex justify-center gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-[#4a5842] text-[#4a5842] w-32"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRole}
                  className="bg-[#4a5842] text-white hover:bg-[#3e4a36] w-32"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Create Role"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
