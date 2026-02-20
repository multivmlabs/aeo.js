import type { AeoConfig } from '../types';
import { AeoWidget, type AeoWidgetOptions } from './core';

export const AeoWidgetVue = {
  name: 'AeoWidget',
  props: {
    config: {
      type: Object as any,
      default: () => ({}),
    },
  },
  setup(props: any) {
    const vue = require('vue');
    const widgetInstance = vue.ref(null as AeoWidget | null);
    const containerRef = vue.ref(null as HTMLDivElement | null);

    vue.onMounted(() => {
      if (!containerRef.value) return;

      const options: AeoWidgetOptions = {
        config: props.config,
        container: containerRef.value,
      };

      widgetInstance.value = new AeoWidget(options);
    });

    vue.onUnmounted(() => {
      if (widgetInstance.value) {
        widgetInstance.value.destroy();
        widgetInstance.value = null;
      }
    });

    return () => vue.h('div', {
      ref: containerRef,
      class: 'aeo-widget-vue-container',
    });
  },
};

export function useAeoWidget(config?: Partial<AeoConfig>) {
  const vue = require('vue');
  const widget = vue.ref(null as AeoWidget | null);

  const init = (customConfig?: Partial<AeoConfig>) => {
    if (widget.value) {
      widget.value.destroy();
    }

    const options: AeoWidgetOptions = {
      config: customConfig || config,
    };

    widget.value = new AeoWidget(options);
  };

  const destroy = () => {
    if (widget.value) {
      widget.value.destroy();
      widget.value = null;
    }
  };

  vue.onMounted(() => {
    if (config) {
      init();
    }
  });

  vue.onUnmounted(() => {
    destroy();
  });

  return {
    widget,
    init,
    destroy,
  };
}

export default AeoWidgetVue;
