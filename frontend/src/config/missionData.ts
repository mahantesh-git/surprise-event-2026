export interface MissionDirective {
  title: string;
  operation: string;
  briefing: string;
  modelSrc: string;
}

export const MISSION_DATA: MissionDirective[] = [
  {
    title: 'UPLINK INGRESS',
    operation: 'SATELLITE ANTENNA',
    briefing: 'Establish a secure uplink relay at the designated site to restore command communication.',
    modelSrc: '/assets/models/mission/uplink-antenna.glb',
  },
  {
    title: 'DATA BREACH',
    operation: 'SERVER CORE',
    briefing: 'Synchronize with the local server node to begin the encrypted data extraction sequence.',
    modelSrc: '/assets/models/mission/data-breach-core.glb',
  },
  {
    title: 'SIGNAL SCRAMBLER',
    operation: 'JAMMER UNIT',
    briefing: 'Activate the signal jammer at the target coordinates to disrupt hostile tracking telemetry.',
    modelSrc: '/assets/models/mission/signal-scrambler.glb',
  },
  {
    title: 'CORE PULSE',
    operation: 'FUSION REACTOR',
    briefing: 'Stabilize the fusion reactor core at the final node to bypass the network lockdown.',
    modelSrc: '/assets/models/mission/core-pulse-reactor.glb',
  },
];
