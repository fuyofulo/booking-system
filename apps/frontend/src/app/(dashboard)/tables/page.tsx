"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/components/ToastContext";
import { TABLE_URLS } from "@/lib/api-urls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Utensils,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Table {
  id: number;
  name: string;
  capacity: number;
}

export default function TablesPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();

  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addTableModalOpen, setAddTableModalOpen] = useState(false);
  const [editTableModalOpen, setEditTableModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState<number>(4);

  // Fetch tables
  const fetchTables = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${TABLE_URLS.GET_ALL}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tables");
      }

      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
      addToast("Failed to fetch tables", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add new table
  const handleAddTable = async () => {
    if (!selectedRestaurant || !tableName || tableCapacity <= 0) {
      addToast("Please fill in all fields correctly", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(TABLE_URLS.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurant.id,
          name: tableName,
          capacity: tableCapacity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add table");
      }

      const data = await response.json();
      addToast("Table added successfully", "success");
      
      // Add the new table to our local state
      if (data.table) {
        setTables((prev) => [...prev, data.table]);
      }
      
      // Close modal and reset form
      setAddTableModalOpen(false);
      setTableName("");
      setTableCapacity(4);
      
      // Refresh tables list
      fetchTables();
    } catch (error) {
      console.error("Error adding table:", error);
      addToast("Failed to add table", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing table
  const handleUpdateTable = async () => {
    if (!selectedRestaurant || !selectedTable || !tableName || tableCapacity <= 0) {
      addToast("Please fill in all fields correctly", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(TABLE_URLS.UPDATE(selectedTable.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          name: tableName,
          capacity: tableCapacity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update table");
      }

      addToast("Table updated successfully", "success");
      
      // Update the table in our local state
      setTables((prev) => 
        prev.map((table) => 
          table.id === selectedTable.id 
            ? { ...table, name: tableName, capacity: tableCapacity } 
            : table
        )
      );
      
      // Close modal and reset form
      setEditTableModalOpen(false);
      setSelectedTable(null);
      setTableName("");
      setTableCapacity(4);
    } catch (error) {
      console.error("Error updating table:", error);
      addToast("Failed to update table", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete table
  const handleDeleteTable = async (tableId: number) => {
    if (!selectedRestaurant) return;
    
    if (!confirm("Are you sure you want to delete this table?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(TABLE_URLS.DELETE(tableId), {
        method: "DELETE",
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete table");
      }

      addToast("Table deleted successfully", "success");
      
      // Remove the table from our local state
      setTables((prev) => prev.filter((table) => table.id !== tableId));
    } catch (error) {
      console.error("Error deleting table:", error);
      addToast("Failed to delete table", "error");
    }
  };

  // Open edit modal with selected table data
  const openEditModal = (table: Table) => {
    setSelectedTable(table);
    setTableName(table.name);
    setTableCapacity(table.capacity);
    setEditTableModalOpen(true);
  };

  useEffect(() => {
    if (selectedRestaurant) {
      fetchTables();
    }
  }, [selectedRestaurant]);

  // Reset form when modals are closed
  useEffect(() => {
    if (!addTableModalOpen && !editTableModalOpen) {
      setTableName("");
      setTableCapacity(4);
      setSelectedTable(null);
    }
  }, [addTableModalOpen, editTableModalOpen]);

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Table Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to manage tables
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
                tables
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

  // Check if current user has permission to manage tables
  const canManageTables = selectedRestaurant.role.canManageTables;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and add table button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurant Tables</h1>
          <p className="text-white/80 mt-1 px-1">
            View and manage tables in your restaurant
          </p>
        </div>

        {canManageTables && (
          <div className="mt-2 md:mt-0">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 font-medium rounded-2xl"
              onClick={() => setAddTableModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Table
            </Button>
          </div>
        )}
      </div>

      {/* Tables display */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-[#4a5842] text-white">
          <CardContent className="pb-6 px-6 pt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-white">Loading tables...</p>
              </div>
            ) : tables.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <Card 
                    key={table.id} 
                    className="bg-white text-black overflow-hidden border-2 hover:border-[#A3CB8F] transition-all"
                  >
                    <CardHeader className="py-3 bg-[#A3CB8F]/10 border-b">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-medium flex items-center">
                          <Utensils className="h-4 w-4 mr-2 text-[#4a5842]" />
                          {table.name}
                        </CardTitle>
                        <Badge variant="outline" className="bg-[#4a5842] text-white">
                          {table.capacity} {table.capacity === 1 ? 'seat' : 'seats'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex justify-center items-center mb-3">
                        <div className="relative flex flex-wrap justify-center gap-1 max-w-[150px]">
                          {Array.from({ length: Math.min(table.capacity, 12) }).map((_, i) => (
                            <Users key={i} className="h-4 w-4 text-[#4a5842]" />
                          ))}
                          {table.capacity > 12 && (
                            <span className="text-xs text-[#4a5842] font-medium">+{table.capacity - 12} more</span>
                          )}
                        </div>
                      </div>
                      
                      {canManageTables && (
                        <div className="flex justify-between gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-[#4a5842] text-[#4a5842] hover:bg-[#4a5842] hover:text-white"
                            onClick={() => openEditModal(table)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            onClick={() => handleDeleteTable(table.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white">
                <p className="mb-4">No tables found</p>
                {canManageTables && (
                  <Button
                    onClick={() => setAddTableModalOpen(true)}
                    className="bg-white hover:bg-white/90 text-[#4a5842]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Table
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Table Modal */}
      <Dialog open={addTableModalOpen} onOpenChange={setAddTableModalOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddTable();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g., Table 1, Window Booth, etc."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tableCapacity">Capacity (number of people)</Label>
              <Input
                id="tableCapacity"
                type="number"
                min="1"
                value={tableCapacity}
                onChange={(e) => setTableCapacity(parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#4a5842] hover:bg-[#4a5842]/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  "Add Table"
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

      {/* Edit Table Modal */}
      <Dialog open={editTableModalOpen} onOpenChange={setEditTableModalOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateTable();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="editTableName">Table Name</Label>
              <Input
                id="editTableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="editTableCapacity">
                Capacity (number of people)
              </Label>
              <Input
                id="editTableCapacity"
                type="number"
                min="1"
                value={tableCapacity}
                onChange={(e) => setTableCapacity(parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#4a5842] hover:bg-[#4a5842]/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
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
    </div>
  );
}
