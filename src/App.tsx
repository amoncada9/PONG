/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, Settings, Smartphone } from 'lucide-react';

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 10;
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 500;
const INITIAL_BALL_SPEED = 5;
const SPEED_INCREMENT = 0.2;
const MAX_BALL_SPEED = 15;

interface GameState {
  ballX: number;
  ballY: number;
  ballDX: number;
  ballDY: number;
  playerY: number;
  aiY: number;
  playerScore: number;
  aiScore: number;
  isPaused: boolean;
  isGameOver: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT });
  const [gameState, setGameState] = useState<GameState>({
    ballX: LOGICAL_WIDTH / 2,
    ballY: LOGICAL_HEIGHT / 2,
    ballDX: INITIAL_BALL_SPEED,
    ballDY: INITIAL_BALL_SPEED,
    playerY: LOGICAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    aiY: LOGICAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    playerScore: 0,
    aiScore: 0,
    isPaused: true,
    isGameOver: false,
  });

  const requestRef = useRef<number>(null);
  const gameStateRef = useRef<GameState>(gameState);

  // Sync ref with state for the game loop
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Handle Resizing
  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Maintain aspect ratio 16:10 (800:500)
        const newWidth = width;
        const newHeight = (width * LOGICAL_HEIGHT) / LOGICAL_WIDTH;
        setDimensions({ width: newWidth, height: newHeight });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.disconnect();
  }, []);

  const resetBall = (direction: number) => {
    return {
      ballX: LOGICAL_WIDTH / 2,
      ballY: LOGICAL_HEIGHT / 2,
      ballDX: direction * INITIAL_BALL_SPEED,
      ballDY: (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED,
    };
  };

  const update = useCallback(() => {
    if (gameStateRef.current.isPaused || gameStateRef.current.isGameOver) return;

    let { ballX, ballY, ballDX, ballDY, playerY, aiY, playerScore, aiScore } = gameStateRef.current;

    // Move ball
    ballX += ballDX;
    ballY += ballDY;

    // Wall collisions (top/bottom)
    if (ballY <= 0 || ballY + BALL_SIZE >= LOGICAL_HEIGHT) {
      ballDY *= -1;
    }

    // Paddle collisions
    // Player paddle
    if (
      ballX <= PADDLE_WIDTH &&
      ballY + BALL_SIZE >= playerY &&
      ballY <= playerY + PADDLE_HEIGHT
    ) {
      ballDX = Math.abs(ballDX) + SPEED_INCREMENT;
      const hitPos = (ballY + BALL_SIZE / 2 - (playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      ballDY += hitPos * 2;
    }

    // AI paddle
    if (
      ballX + BALL_SIZE >= LOGICAL_WIDTH - PADDLE_WIDTH &&
      ballY + BALL_SIZE >= aiY &&
      ballY <= aiY + PADDLE_HEIGHT
    ) {
      ballDX = -(Math.abs(ballDX) + SPEED_INCREMENT);
      const hitPos = (ballY + BALL_SIZE / 2 - (aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      ballDY += hitPos * 2;
    }

    // Speed capping
    ballDX = Math.max(Math.min(ballDX, MAX_BALL_SPEED), -MAX_BALL_SPEED);
    ballDY = Math.max(Math.min(ballDY, MAX_BALL_SPEED), -MAX_BALL_SPEED);

    // Scoring
    if (ballX <= 0) {
      aiScore += 1;
      const reset = resetBall(1);
      ballX = reset.ballX;
      ballY = reset.ballY;
      ballDX = reset.ballDX;
      ballDY = reset.ballDY;
    } else if (ballX + BALL_SIZE >= LOGICAL_WIDTH) {
      playerScore += 1;
      const reset = resetBall(-1);
      ballX = reset.ballX;
      ballY = reset.ballY;
      ballDX = reset.ballDX;
      ballDY = reset.ballDY;
    }

    // AI Movement
    const aiSpeed = 4 + Math.min(playerScore / 2, 4);
    const aiTarget = ballY - PADDLE_HEIGHT / 2;
    if (aiY < aiTarget) aiY += aiSpeed;
    if (aiY > aiTarget) aiY -= aiSpeed;
    aiY = Math.max(0, Math.min(LOGICAL_HEIGHT - PADDLE_HEIGHT, aiY));

    setGameState((prev) => ({
      ...prev,
      ballX,
      ballY,
      ballDX,
      ballDY,
      aiY,
      playerScore,
      aiScore,
    }));
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { ballX, ballY, playerY, aiY } = gameStateRef.current;
    
    // Scale context to match logical coordinates
    ctx.save();
    ctx.scale(dimensions.width / LOGICAL_WIDTH, dimensions.height / LOGICAL_HEIGHT);

    // Clear canvas
    ctx.fillStyle = '#151619';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(LOGICAL_WIDTH / 2, 0);
    ctx.lineTo(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    
    ctx.fillRect(0, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(LOGICAL_WIDTH - PADDLE_WIDTH, aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ballX + BALL_SIZE / 2, ballY + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, [dimensions]);

  const gameLoop = useCallback(() => {
    update();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  const updatePlayerPosition = (y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relativeY = (y - rect.top) * (LOGICAL_HEIGHT / rect.height);
    setGameState((prev) => ({
      ...prev,
      playerY: Math.max(0, Math.min(LOGICAL_HEIGHT - PADDLE_HEIGHT, relativeY - PADDLE_HEIGHT / 2)),
    }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updatePlayerPosition(e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updatePlayerPosition(e.touches[0].clientY);
    }
  };

  const togglePause = () => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetGame = () => {
    setGameState({
      ballX: LOGICAL_WIDTH / 2,
      ballY: LOGICAL_HEIGHT / 2,
      ballDX: INITIAL_BALL_SPEED,
      ballDY: INITIAL_BALL_SPEED,
      playerY: LOGICAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      aiY: LOGICAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      playerScore: 0,
      aiScore: 0,
      isPaused: false,
      isGameOver: false,
    });
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] flex flex-col items-center justify-center p-2 sm:p-8 font-mono overflow-hidden touch-none">
      {/* Hardware Frame */}
      <div className="w-full max-w-4xl bg-[#151619] p-1 rounded-xl sm:rounded-2xl shadow-2xl border-4 sm:border-8 border-[#2A2D35] relative overflow-hidden">
        {/* Status Bar */}
        <div className="flex justify-between items-center px-3 sm:px-6 py-2 sm:py-4 bg-[#1A1D23] border-b border-white/5">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] text-[#8E9299] uppercase tracking-widest">Player</span>
              <span className="text-lg sm:text-2xl font-bold text-white tabular-nums">{gameState.playerScore}</span>
            </div>
            <div className="h-6 sm:h-8 w-[1px] bg-white/10 mx-1 sm:mx-2" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] text-[#8E9299] uppercase tracking-widest">CPU</span>
              <span className="text-lg sm:text-2xl font-bold text-white tabular-nums">{gameState.aiScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden xs:flex flex-col items-end">
              <span className="text-[8px] sm:text-[10px] text-[#8E9299] uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${gameState.isPaused ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                <span className="text-[10px] sm:text-xs text-white uppercase tracking-wider">
                  {gameState.isPaused ? 'Standby' : 'Active'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={togglePause}
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white"
              >
                {gameState.isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button 
                onClick={resetGame}
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Game Area Container */}
        <div ref={containerRef} className="relative w-full aspect-[16/10] bg-[#151619] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchMove}
            className="w-full h-full cursor-none"
          />

          {/* Overlay Screens */}
          <AnimatePresence>
            {gameState.isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="text-center px-4"
                >
                  <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-8 tracking-tighter uppercase italic">
                    Retro Pong Mobile
                  </h2>
                  <button
                    onClick={togglePause}
                    className="group relative px-6 sm:px-8 py-2 sm:py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors text-sm sm:text-base"
                  >
                    Initialize System
                    <div className="absolute -inset-1 border border-white/20 group-hover:border-emerald-400/50 transition-colors" />
                  </button>
                  <div className="mt-6 flex flex-col items-center gap-2 text-[#8E9299]">
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} />
                      <p className="text-[10px] sm:text-xs uppercase tracking-widest">
                        Drag to control paddle
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Panel */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 bg-[#1A1D23] border-t border-white/5 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[6px] sm:text-[8px] text-[#8E9299] uppercase tracking-widest">System Load</span>
              <div className="flex gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-0.5 sm:w-1 h-2 sm:h-3 rounded-full ${i < 3 ? 'bg-emerald-500' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] text-[#8E9299] uppercase tracking-widest">
            <Settings size={10} />
            <span>v1.2.0-mobile</span>
          </div>
        </div>
      </div>

      {/* Decorative Elements - Hidden on small screens */}
      <div className="hidden sm:flex mt-8 gap-12 text-[#8E9299]">
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Precision</span>
          <div className="h-[1px] w-12 bg-[#8E9299]/20 mt-2" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Velocity</span>
          <div className="h-[1px] w-12 bg-[#8E9299]/20 mt-2" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Tactical</span>
          <div className="h-[1px] w-12 bg-[#8E9299]/20 mt-2" />
        </div>
      </div>
    </div>
  );
}
