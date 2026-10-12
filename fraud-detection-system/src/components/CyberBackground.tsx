import React, { useEffect, useRef } from 'react';

interface CyberBackgroundProps {
  showCentralScanner?: boolean;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulsePhase: number;
}

interface DataPacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
}

export const CyberBackground: React.FC<CyberBackgroundProps> = ({ showCentralScanner = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive node count based on screen width
    const nodeCount = Math.min(42, Math.floor((width * height) / 28000));
    const nodes: Node[] = [];
    const maxDistance = 145;

    // Palette: Cyan, Electric Blue, Subtle White-Blue
    const colors = [
      'rgba(0, 217, 255, 0.75)',
      'rgba(22, 119, 255, 0.75)',
      'rgba(54, 200, 255, 0.65)',
      'rgba(148, 163, 184, 0.5)'
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.8 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Occasional data packets traveling between nodes
    const packets: DataPacket[] = [];
    const maxPackets = 6;

    // Horizontal scanning line state
    let scanY = 0;
    const scanSpeed = 0.8;

    // Radar scanner angle for central scanner
    let radarAngle = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint cybernetic background grid
      ctx.strokeStyle = 'rgba(22, 119, 255, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      const startX = 0;
      const startY = 0;

      ctx.beginPath();
      for (let x = startX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Moving Grid Light pulses
      const gridTime = time * 0.001;
      for (let k = 0; k < 6; k++) {
        const gx = ((Math.sin(gridTime * 0.4 + k * 1.5) + 1) * 0.5 * Math.floor(width / gridSize)) * gridSize;
        const gy = ((Math.cos(gridTime * 0.3 + k * 2.1) + 1) * 0.5 * Math.floor(height / gridSize)) * gridSize;
        
        ctx.beginPath();
        ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 217, 255, 0.4)';
        ctx.shadowColor = 'rgba(0, 217, 255, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw horizontal scanning beam (faint light sweep)
      scanY += scanSpeed;
      if (scanY > height) scanY = -20;
      const scanGradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGradient.addColorStop(0, 'rgba(0, 217, 255, 0)');
      scanGradient.addColorStop(0.5, 'rgba(0, 217, 255, 0.04)');
      scanGradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanY - 30, width, 60);

      // Central Security Scanner (if enabled, e.g. behind login)
      if (showCentralScanner) {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.28;

        radarAngle += 0.008;

        // Concentric faint rings
        [baseRadius * 0.5, baseRadius * 0.8, baseRadius, baseRadius * 1.2].forEach((r, idx) => {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = idx % 2 === 0 ? 'rgba(0, 217, 255, 0.06)' : 'rgba(22, 119, 255, 0.04)';
          ctx.lineWidth = idx === 2 ? 1.5 : 1;
          ctx.setLineDash(idx % 2 === 1 ? [4, 8] : []);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Rotating radar sweep arc
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(radarAngle);
        const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 1.2);
        sweepGrad.addColorStop(0, 'rgba(0, 217, 255, 0.08)');
        sweepGrad.addColorStop(0.7, 'rgba(0, 217, 255, 0.03)');
        sweepGrad.addColorStop(1, 'rgba(0, 217, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, baseRadius * 1.2, 0, Math.PI / 3);
        ctx.closePath();
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Scanning leading beam line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(baseRadius * 1.2, 0);
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // Subtle pulsing core aura
        const pulseCore = Math.sin(time * 0.002) * 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.35 + pulseCore, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(36, 149, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Update and draw network nodes
      const connections: { from: number; to: number }[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          // Bounce off boundaries
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          node.pulsePhase += 0.02;
        }

        // Draw node
        const pulse = Math.sin(node.pulsePhase) * 0.4 + 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = 'rgba(0, 217, 255, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Check distance to other nodes to draw lines
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 217, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            connections.push({ from: i, to: j });
          }
        }
      }

      // Spawn or update data packets traveling along lines
      if (!prefersReducedMotion && connections.length > 0) {
        if (packets.length < maxPackets && Math.random() < 0.06) {
          const conn = connections[Math.floor(Math.random() * connections.length)];
          packets.push({
            fromNode: conn.from,
            toNode: conn.to,
            progress: 0,
            speed: Math.random() * 0.015 + 0.008
          });
        }

        for (let p = packets.length - 1; p >= 0; p--) {
          const pkt = packets[p];
          pkt.progress += pkt.speed;

          if (pkt.progress >= 1) {
            packets.splice(p, 1);
            continue;
          }

          const n1 = nodes[pkt.fromNode];
          const n2 = nodes[pkt.toNode];
          if (!n1 || !n2) {
            packets.splice(p, 1);
            continue;
          }

          const curX = n1.x + (n2.x - n1.x) * pkt.progress;
          const curY = n1.y + (n2.y - n1.y) * pkt.progress;

          ctx.beginPath();
          ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = '#00D9FF';
          ctx.shadowColor = '#00D9FF';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [showCentralScanner]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 opacity-80" 
      aria-hidden="true"
    />
  );
};
