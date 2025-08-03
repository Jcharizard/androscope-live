import { Paper, Typography, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SecurityAlert {
  name: string;
  description: string;
  log: string;
  timestamp: string;
}

interface SecurityAlertsViewerProps {
  alerts: SecurityAlert[];
}

export const SecurityAlertsViewer = ({ alerts }: SecurityAlertsViewerProps) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Security Alerts
      </Typography>
      <Box>
        {alerts.length === 0 ? (
          <Typography>No security alerts detected.</Typography>
        ) : (
          [...alerts].reverse().map((alert, index) => (
            <Accordion key={index} sx={{ bgolor: '#333', mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ color: '#f44336', fontWeight: 'bold' }}>
                  {`[${new Date(alert.timestamp).toLocaleTimeString()}] ${alert.name}`}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" gutterBottom>{alert.description}</Typography>
                <Typography
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    bgcolor: '#1a1a1a',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {alert.log}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Paper>
  );
}; 