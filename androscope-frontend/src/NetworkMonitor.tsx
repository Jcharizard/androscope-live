import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

interface NetworkEvent {
  name: string;
  description: string;
  timestamp: string;
}

interface NetworkMonitorProps {
  events: NetworkEvent[];
}

export const NetworkMonitor = ({ events }: NetworkMonitorProps) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Network Monitor (DNS Queries)
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...events].reverse().map((event, index) => (
              <TableRow hover key={index}>
                <TableCell>{new Date(event.timestamp).toLocaleTimeString()}</TableCell>
                <TableCell>{event.name}</TableCell>
                <TableCell>{event.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}; 