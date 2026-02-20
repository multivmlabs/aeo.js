import { defineComponent, h, onMounted, onUnmounted, ref, PropType } from 'vue';
import type { AeoConfig } from '../types';
import { AeoWidget, type AeoWidgetOptions } from './core';

export const AeoWidgetVue = defineComponent({
  name: 'AeoWidget',
  props: {
    config: {
      type: Object as PropType<Partial<AeoConfig>>,
      default: () => ({}),
    },
  },
  setup(props) {
    const widgetInstance = ref<AeoWidget | null>(null);
    const containerRef = ref<HTMLDivElement | null>(null);

    onMounted(() => {
      if (!containerRef.value) return;
      
      const options: AeoWidgetOptions = {
        config: props.config,
        container: containerRef.value,
      };
      
      widgetInstance.value = new AeoWidget(options);
    });

    onUnmounted(() => {
      if (widgetInstance.value) {
        widgetInstance.value.destroy();
        widgetInstance.value = null;
      }
    });

    return () => h('div', {
      ref: containerRef,
      class: 'aeo-widget-vue-container',
    });
  },
});

export function useAeoWidget(config?: Partial<AeoConfig>) {
  const widget = ref<AeoWidget | null>(null);

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

  onMounted(() => {
    if (config) {
      init();
    }
  });

  onUnmounted(() => {
    destroy();
  });

  return {
    widget,
    init,
    destroy,
  };
}

export default AeoWidgetVue;