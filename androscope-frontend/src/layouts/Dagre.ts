import dagre from 'dagre';
import { type Node, type Edge } from 'reactflow';

export class DagreLayout {
  private dagreGraph: dagre.graphlib.Graph;
  private nodeWidth = 172;
  private nodeHeight = 36;

  constructor() {
    this.dagreGraph = new dagre.graphlib.Graph();
    this.dagreGraph.setDefaultEdgeLabel(() => ({}));
    this.dagreGraph.setGraph({ rankdir: 'LR' }); // Left-to-Right layout
  }

  getLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
    this.dagreGraph.setGraph({ rankdir: 'LR' });
    nodes.forEach((node) => {
      this.dagreGraph.setNode(node.id, { width: this.nodeWidth, height: this.nodeHeight });
    });

    edges.forEach((edge) => {
      this.dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(this.dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = this.dagreGraph.node(node.id);
      node.targetPosition = 'left';
      node.sourcePosition = 'right';

      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      node.position = {
        x: nodeWithPosition.x - this.nodeWidth / 2,
        y: nodeWithPosition.y - this.nodeHeight / 2,
      };

      return node;
    });

    return { nodes: layoutedNodes, edges };
  }
} 