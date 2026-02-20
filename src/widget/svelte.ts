import type { AeoConfig } from '../types';
import { AeoWidget, type AeoWidgetOptions } from './core';

export function createAeoWidget(config?: Partial<AeoConfig>) {
  let widget: AeoWidget | null = null;

  const init = (customConfig?: Partial<AeoConfig>) => {
    if (widget) {
      widget.destroy();
    }
    
    const options: AeoWidgetOptions = {
      config: customConfig || config,
    };
    
    widget = new AeoWidget(options);
    return widget;
  };

  const destroy = () => {
    if (widget) {
      widget.destroy();
      widget = null;
    }
  };

  return {
    init,
    destroy,
    get widget() {
      return widget;
    },
  };
}

export function aeoWidget(node: HTMLElement, config?: Partial<AeoConfig>) {
  const options: AeoWidgetOptions = {
    config,
    container: node,
  };
  
  let widget = new AeoWidget(options);

  return {
    update(newConfig: Partial<AeoConfig>) {
      widget.destroy();
      const newOptions: AeoWidgetOptions = {
        config: newConfig,
        container: node,
      };
      widget = new AeoWidget(newOptions);
    },
    destroy() {
      widget.destroy();
    },
  };
}