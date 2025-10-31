// Canvas.tsx
'use client';
import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlantComponent from "./PlantComponent";
import ComponentDetailDialog from "./ComponentDetailDialog";
import ConnectionArrow from "./ConnectionArrow";
import ConnectionDetailDialog from "./ConnectionDetailDialog";
import { PlacedComponent as PlacedComponentType, Connection as ConnectionType } from "../../app/plant-builder/types";

type CanvasProps = {
  components: PlacedComponentType[];
  setComponents: React.Dispatch<React.SetStateAction<PlacedComponentType[]>>;
  connections: ConnectionType[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionType[]>>;
  onConnect: (params: { source: string; target: string }) => void;
};

const Canvas = ({
  components,
  setComponents,
  connections,
  setConnections,
  onConnect,
}: CanvasProps) => {
  const [selectedComponent, setSelectedComponent] = useState<PlacedComponentType | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionType | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponent, setNewComponent] = useState({
    name: "",
    type: "" as "equipment" | "carrier" | "gate",
    category: "",
  });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await import("@/data/examplePlant.json");
        if (!mounted || components.length > 0 || connections.length > 0) return;
        setComponents((data.default.components || []) as PlacedComponentType[]);
        setConnections((data.default.connections || []) as ConnectionType[]);
      } catch (e) {
        console.warn("Could not load example plant", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [components.length, connections.length, setComponents, setConnections]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const componentData = JSON.parse(e.dataTransfer.getData("component"));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newComp: PlacedComponentType = {
        ...componentData,
        id: `${componentData.id}-${Date.now()}`,
        position: {
          x: (e.clientX - rect.left) / zoom,
          y: (e.clientY - rect.top) / zoom,
        },
        data: componentData.data || {
          technicalData: {},
        },
        certifications: componentData.certifications || [],
      };
      setComponents((prev) => [...prev, newComp]);
    },
    [zoom, setComponents]
  );

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleConnectStart = (id: string) => setConnectingFrom(id);

  const handleConnectEnd = (id: string) => {
    if (connectingFrom && connectingFrom !== id) {
      onConnect({ source: connectingFrom, target: id });
    }
    setConnectingFrom(null);
  };

  const handleComponentClick = (comp: PlacedComponentType) => {
    if (connectingFrom) {
      handleConnectEnd(comp.id);
    } else {
      setSelectedComponent(comp);
    }
  };

  const handleComponentMove = (id: string, position: { x: number; y: number }) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, position } : c))
    );
  };

  const handleSaveDetails = (
    id: string,
    data: PlacedComponentType["data"],
    certifications: string[]
  ) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, data, certifications } : c))
    );
    setSelectedComponent(null);
  };

  const handleSaveConnection = (
    id: string,
    type: string,
    reason: string,
    data: any
  ) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, type, reason, data } : c))
    );
    setSelectedConnection(null);
  };

  const handleAddNewComponent = () => {
    if (!newComponent.name || !newComponent.type || !newComponent.category) return;

    const comp: PlacedComponentType = {
      id: `comp-${Date.now()}`,
      name: newComponent.name,
      type: newComponent.type,
      category: newComponent.category,
      position: { x: 100, y: 100 },
      data: { technicalData: {} },
      certifications: [],
    };
    setComponents((prev) => [...prev, comp]);
    setNewComponent({ name: "", type: "" as any, category: "" });
    setShowAddComponent(false);
  };

  const getComponentPosition = (id: string) =>
    components.find((c) => c.id === id)?.position;

  return (
    <div className="flex-1 flex flex-col bg-canvas-bg relative">
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
          className="bg-card"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
          className="bg-card"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {connectingFrom && (
        <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          Click another component to connect
        </div>
      )}

      <div
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex-1 relative overflow-auto"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--canvas-grid)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--canvas-grid)) 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        }}
      >
        <div
          className="relative w-full h-full min-w-[2400px] min-h-[1800px]"
          style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-layer-equipment/5" />
            <div
              className="absolute top-0 bottom-0"
              style={{ left: "33.3333%", width: "33.3333%" }}
            >
              <div className="absolute inset-0 bg-layer-carrier/5" />
            </div>
            <div className="absolute top-0 bottom-0 right-0 w-1/3 bg-layer-gate/5" />
          </div>

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {connections.map((conn) => {
              const from = getComponentPosition(conn.from);
              const to = getComponentPosition(conn.to);
              if (!from || !to) return null;
              return (
                <ConnectionArrow
                  key={conn.id}
                  from={from}
                  to={to}
                  onClick={() => setSelectedConnection(conn)}
                />
              );
            })}
          </svg>

          <div className="relative pointer-events-none" style={{ zIndex: 10 }}>
            <div className="pointer-events-auto">
              {components.map((comp) => (
                <PlantComponent
                  key={comp.id}
                  component={comp}
                  onClick={() => handleComponentClick(comp)}
                  onMove={handleComponentMove}
                  onConnectStart={handleConnectStart}
                  onConnectEnd={handleConnectEnd}
                  isConnecting={connectingFrom === comp.id}
                />
              ))}
            </div>
          </div>

          {components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-4 max-w-2xl px-8">
                <Plus className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <h3 className="text-xl font-semibold text-foreground">
                  Start Building Your Plant
                </h3>
                <p className="text-muted-foreground">
                  Drag from library or add component
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedComponent && (
        <ComponentDetailDialog
          component={selectedComponent}
          components={components}
          connections={connections}
          open={!!selectedComponent}
          onClose={() => setSelectedComponent(null)}
          onSave={handleSaveDetails}
          onAddConnection={(from, to, type, reason) => {
            const id = `conn-${Date.now()}`;
            setConnections((prev) => [...prev, { id, from, to, type, reason }]);
          }}
        />
      )}

      {selectedConnection && (
        <ConnectionDetailDialog
          connection={selectedConnection}
          components={components}
          open={!!selectedConnection}
          onClose={() => setSelectedConnection(null)}
          onSave={handleSaveConnection}
        />
      )}

      <Dialog open={showAddComponent} onOpenChange={setShowAddComponent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={newComponent.type}
                onValueChange={(v) =>
                  setNewComponent({ ...newComponent, type: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="carrier">Carrier</SelectItem>
                  <SelectItem value="gate">Gate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newComponent.name}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, name: e.target.value })
                }
                placeholder="e.g. Electrolyzer"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input
                value={newComponent.category}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, category: e.target.value })
                }
                placeholder="e.g. Power-to-X"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddComponent(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewComponent}
              disabled={
                !newComponent.name ||
                !newComponent.type ||
                !newComponent.category
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Canvas;