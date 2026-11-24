export type ShapeVariant = "process" | "rounded" | "decision" | "terminator" | "io" | "circle";

export type ShapeDefinition = {
  id: ShapeVariant;
  label: string;
  width: number;
  height: number;
  fill: string;
};

export const SHAPE_REGISTRY: ShapeDefinition[] = [
  { id: "process", label: "Process", width: 160, height: 72, fill: "#ffffff" },
  { id: "rounded", label: "Rounded process", width: 160, height: 72, fill: "#ffffff" },
  { id: "decision", label: "Decision", width: 150, height: 150, fill: "#1f2937" },
  { id: "terminator", label: "Terminator", width: 160, height: 72, fill: "#1f2937" },
  { id: "io", label: "Input/Output", width: 160, height: 72, fill: "#ffffff" },
  { id: "circle", label: "Circle", width: 96, height: 96, fill: "#ffffff" },
];

export function shapeDefinition(id: string): ShapeDefinition {
  return SHAPE_REGISTRY.find((shape) => shape.id === id) ?? SHAPE_REGISTRY[0];
}
