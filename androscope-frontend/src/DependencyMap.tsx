import { useMemo } from 'react';
import ReactFlow, { MiniMap, Controls, Background, type Node, type Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Paper, Typography, Box } from '@mui/material';
import { DagreLayout } from './layouts/Dagre'; // We will create this layout helper

interface NetworkEvent {
  name: string;
}

interface DependencyMapProps {
  events: NetworkEvent[];
}

const dagreLayout = new DagreLayout();

export const DependencyMap = ({ events }: DependencyMapProps) => {
  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = [{ id: 'app', data: { label: 'Monitored App' }, position: { x: 0, y: 0 }, type: 'input' }];
    const initialEdges: Edge[] = [];
    const domainNodes = new Set<string>();

    events.forEach(event => {
      const domainMatch = event.name.match(/DNS Query: (.+)/);
      if (domainMatch && domainMatch[1]) {
        const domain = domainMatch[1];
        if (!domainNodes.has(domain)) {
          domainNodes.add(domain);
          initialNodes.push({ id: domain, data: { label: domain }, position: { x: 0, y: 0 } });
          initialEdges.push({ id: `edge-${domain}`, source: 'app', target: domain, animated: true });
        }
      }
    });

    const layout = dagreLayout.getLayout(initialNodes, initialEdges);

    return {
      nodes: layout.nodes,
      edges: layout.edges,
    };
  }, [events]);

  return (
    <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Visual Dependency Map
      </Typography>
      {nodes.length > 1 ? (
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography>No network events detected yet.</Typography>
        </Box>
      )}
    </Paper>
  );
}; 