import EventEmitter from 'node:events';

class UIWidgetStore extends EventEmitter {
  constructor() {
    super();
    this.widgets = new Map();
  }

  getWidgets() {
    return Array.from(this.widgets.values());
  }

  getWidget(id) {
    return this.widgets.get(id) || null;
  }

  injectWidget(spec = {}) {
    const id = String(spec.id || 'widget-' + Date.now().toString(36));
    const widget = {
      id,
      title: String(spec.title || 'Dynamic Widget'),
      html: String(spec.html || ''),
      css: String(spec.css || ''),
      js: String(spec.js || ''),
      target: String(spec.target || 'workspace-stage'),
      createdAt: new Date().toISOString(),
    };
    this.widgets.set(id, widget);
    this.emit('widget-injected', widget);
    return widget;
  }

  removeWidget(id) {
    const existed = this.widgets.delete(id);
    if (existed) this.emit('widget-removed', { id });
    return existed;
  }

  clear() {
    this.widgets.clear();
  }
}

const uiWidgetStore = new UIWidgetStore();
export default uiWidgetStore;
