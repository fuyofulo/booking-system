"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import { ROLE_URLS, RESTAURANT_USER_URLS, GENERAL_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  UserPlus,
  Shield,
  Mail,
  User,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  email: string;
  name: string;
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

interface RestaurantUser {
  id: number;
  userId: string;
  restaurantId: number;
  roleId: number;
  user: User;
  role: Role;
}

export default function StaffPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();
  const [staff, setStaff] = useState<RestaurantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<RestaurantUser | null>(
    null
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesInitialized, setRolesInitialized] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Fetch staff members (no retry logic)
  const fetchStaff = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        RESTAURANT_USER_URLS.GET_STAFF(selectedRestaurant.restaurant.id),
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }

      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
      addToast("Failed to fetch staff members", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedRestaurant, addToast]);

  // Fetch roles when opening the modal
  const fetchRoles = async () => {
    if (!selectedRestaurant) return;
    setRolesLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }
      const response = await fetch(
        `${ROLE_URLS.GET_ROLES}/${selectedRestaurant.restaurant.id}`,
        {
          headers: { Authorization: token },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      console.log("Roles data:", data); // Debugging log
      setRoles(data.roles || data); // fallback if API returns array directly

      // If roles are loaded and there's only one, auto-select it
      if (
        (data.roles && data.roles.length === 1) ||
        (!data.roles && data.length === 1)
      ) {
        const rolesList = data.roles || data;
        setSelectedRoleId(rolesList[0].id);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      addToast("Failed to load roles", "error");
    } finally {
      setRolesLoading(false);
    }
  };

  // Initialize roles on component mount
  useEffect(() => {
    if (selectedRestaurant && !rolesInitialized) {
      fetchRoles();
      setRolesInitialized(true);
    }
  }, [selectedRestaurant]);

  // Open manage modal for a staff member
  const openManageModal = (member: RestaurantUser) => {
    setSelectedStaff(member);
    setSelectedRoleId(member.roleId);
    setManageModalOpen(true);
    fetchRoles();
  };

  // Handle role change
  const handleChangeRole = async () => {
    if (!selectedStaff || !selectedRoleId || !selectedRestaurant) return;
    setRoleChangeLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }
      const response = await fetch(ROLE_URLS.CHANGE_ROLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          userId: selectedStaff.userId,
          restaurantId: selectedRestaurant.restaurant.id,
          newRoleId: selectedRoleId,
        }),
      });
      if (!response.ok) throw new Error("Failed to change role");
      addToast("Role updated successfully", "success");
      // Update staff list locally
      setStaff((prev) =>
        prev.map((s) =>
          s.id === selectedStaff.id
            ? {
                ...s,
                roleId: selectedRoleId,
                role: roles.find((r) => r.id === selectedRoleId) || s.role,
              }
            : s
        )
      );
      setManageModalOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      addToast("Failed to update role", "error");
    } finally {
      setRoleChangeLoading(false);
    }
  };

  // Check if email exists
  const checkEmail = async () => {
    if (!email) {
      setEmailError("Please enter an email address");
      return;
    }

    setIsCheckingEmail(true);
    setEmailError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      // Use GENERAL_URLS.CHECK_EMAIL with a cache-busting parameter
      const timestamp = Date.now();
      const url = `${GENERAL_URLS.CHECK_EMAIL}?_=${timestamp}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.message === "Email found") {
        setEmailVerified(true);
        setEmailError("");
      } else {
        setEmailVerified(false);
        setEmailError("Email not found in the system");
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailError("Failed to verify email");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Add staff member
  const handleAddStaff = async () => {
    if (!selectedRestaurant || !selectedRoleId || !email) return;

    setIsAddingStaff(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(RESTAURANT_USER_URLS.ADD_STAFF, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          email,
          roleId: selectedRoleId,
          restaurantId: selectedRestaurant.restaurant.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add staff member");
      }

      addToast("Staff member added successfully", "success");
      setAddStaffModalOpen(false);
      // Reset form
      setEmail("");
      setEmailVerified(false);
      setSelectedRoleId(null);
      // Refresh staff list
      fetchStaff();
    } catch (error) {
      console.error("Error adding staff:", error);
      addToast("Failed to add staff member", "error");
    } finally {
      setIsAddingStaff(false);
    }
  };

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to manage staff
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
                staff
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

  // Check if current user has permission to manage staff
  const canManageStaff = selectedRestaurant.role.canManageStaff;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and add staff button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurant Staff</h1>
          {roles.length === 0 && !rolesLoading && (
            <p className="text-white/80 text-sm mt-1">
              To add staff members, please create roles first in the{" "}
              <Link href="/roles" className="underline hover:text-white">
                Roles section
              </Link>
            </p>
          )}
        </div>

        {selectedRestaurant.role.canManageStaff && (
          <div className="mt-2 md:mt-0 w-full md:w-auto">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
              onClick={() => {
                setAddStaffModalOpen(true);
                fetchRoles();
              }}
              title={
                roles.length === 0
                  ? "Please create roles first"
                  : "Add a new staff member"
              }
              disabled={roles.length === 0}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        )}
      </div>

      {/* Staff list */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-[#4a5842] text-white">
          <CardContent className="pb-6 px-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading staff members...</p>
              </div>
            ) : staff.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {staff.map((member) => (
                  <Card
                    key={member.id}
                    className="border-2 rounded-3xl overflow-hidden bg-white hover:bg-gray-50 transition-colors max-w-[300px]"
                  >
                    <CardHeader className="py-4 px-6">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-[#4a5842]/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-[#4a5842]" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {member.user.name}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Mail className="h-3 w-3 text-gray-500" />
                            <span className="text-sm text-gray-500">
                              {member.user.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-4">
                      <div className="flex flex-col space-y-3">
                        <Badge
                          variant="outline"
                          className="bg-[#4a5842]/10 text-[#4a5842] border-[#4a5842]/20 w-fit"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role.name}
                        </Badge>
                        {selectedRestaurant.role.canManageStaff && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#4a5842] text-[#4a5842] hover:bg-[#4a5842] hover:text-white w-full"
                            onClick={() => openManageModal(member)}
                          >
                            {`Manage ${member.user.name}`}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No staff members found</p>
                {selectedRestaurant.role.canManageStaff && (
                  <Button
                    asChild
                    className="bg-[#4a5842] hover:bg-[#4a5842]/90"
                  >
                    <Link
                      href="/staff/add"
                      className="text-sm flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Staff Member
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Staff Modal */}
      <Dialog
        open={addStaffModalOpen}
        onOpenChange={(open) => {
          setAddStaffModalOpen(open);
          if (open) {
            fetchRoles();
          }
          if (!open) {
            setEmail("");
            setEmailVerified(false);
            setSelectedRoleId(null);
            setEmailError("");
          }
        }}
      >
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (emailVerified) {
                handleAddStaff();
              } else {
                checkEmail();
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailVerified(false);
                      setEmailError("");
                    }}
                    placeholder="Enter email address"
                    className="flex-1"
                    disabled={emailVerified || isCheckingEmail}
                  />
                  {!emailVerified && (
                    <Button
                      type="button"
                      onClick={checkEmail}
                      disabled={isCheckingEmail || !email}
                      className="bg-[#4a5842] text-white hover:bg-[#778e6b]"
                    >
                      {isCheckingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  )}
                </div>
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
                {emailVerified && (
                  <div className="flex items-center gap-2 text-green-600 mt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Email verified</span>
                  </div>
                )}
              </div>

              {emailVerified && (
                <div>
                  <Label className="mb-2 block">Select Role</Label>
                  <div className="space-y-2">
                    {rolesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        <span className="text-sm">Loading roles...</span>
                      </div>
                    ) : roles.length > 0 ? (
                      roles.map((role) => (
                        <label
                          key={role.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${
                            selectedRoleId === role.id
                              ? "border-[#4a5842] bg-[#A3CB8F]/10"
                              : "border-gray-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role.id}
                            checked={selectedRoleId === role.id}
                            onChange={() => setSelectedRoleId(role.id)}
                            className="accent-[#4a5842]"
                          />
                          <span>{role.name}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-center py-2 text-amber-600">
                        <p>No roles available. Please create roles first.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#4a5842] text-white hover:bg-[#778e6b]"
                disabled={isAddingStaff || !emailVerified || !selectedRoleId}
              >
                {isAddingStaff ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  "Add Staff Member"
                )}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Staff Modal */}
      <Dialog
        open={manageModalOpen}
        onOpenChange={(open) => {
          setManageModalOpen(open);
          if (!open) setSelectedStaff(null);
        }}
      >
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>
              {selectedStaff
                ? `Manage ${selectedStaff.user.name}`
                : "Manage Staff"}
            </DialogTitle>
          </DialogHeader>
          {rolesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin mr-2" /> Loading roles...
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChangeRole();
              }}
              className="space-y-6"
            >
              <div>
                <Label className="mb-2 block">Change Role</Label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${selectedRoleId === role.id ? "border-[#4a5842] bg-[#A3CB8F]/10" : "border-gray-200"}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        checked={selectedRoleId === role.id}
                        onChange={() => setSelectedRoleId(role.id)}
                        className="accent-[#4a5842]"
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  className="bg-[#4a5842] text-white hover:bg-[#778e6b]"
                  disabled={
                    roleChangeLoading ||
                    selectedRoleId === selectedStaff?.roleId
                  }
                >
                  {roleChangeLoading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : null}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  // TODO: Add delete staff logic
                  onClick={() =>
                    addToast("Delete staff not implemented yet", "info")
                  }
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Staff
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
