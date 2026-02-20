import React, { useEffect, useRef } from 'react';
import type { AeoConfig } from '../types';
import { AeoWidget, type AeoWidgetOptions } from './core';

export interface AeoWidgetProps {
  config?: Partial<AeoConfig>;
  className?: string;
}

export const AeoWidgetComponent: React.FC<AeoWidgetProps> = ({ config, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<AeoWidget | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const options: AeoWidgetOptions = {
      config,
      container: containerRef.current,
    };

    widgetRef.current = new AeoWidget(options);

    return () => {
      widgetRef.current?.destroy();
    };
  }, [config]);

  return <div ref={containerRef} className={className} />;
};

// Export with a simpler name
export { AeoWidgetComponent as AeoWidget };