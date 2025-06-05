class PageTransition {
  constructor() {
    this.animationDuration = 300; // milliseconds
    this.supportsViewTransition = 'startViewTransition' in document;
  }
  
  async fadeTransition(container, newContent) {
    if (this.supportsViewTransition) {
      return this._viewTransition(container, newContent, 'fade');
    }
    
    // Fallback to Web Animations API
    const fadeOut = container.animate(
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        duration: this.animationDuration,
        easing: 'ease-out'
      }
    );
    
    await fadeOut.finished;
    container.innerHTML = newContent;
    
    const fadeIn = container.animate(
      [
        { opacity: 0 },
        { opacity: 1 }
      ],
      {
        duration: this.animationDuration,
        easing: 'ease-in'
      }
    );
    
    return fadeIn.finished;
  }
  
  async slideTransition(container, newContent, direction = 'left') {
    if (this.supportsViewTransition) {
      return this._viewTransition(container, newContent, 'slide', { direction });
    }
    
    // Fallback to existing implementation
    const xStart = direction === 'left' ? '100%' : '-100%';
    
    const currentWrapper = document.createElement('div');
    currentWrapper.style.position = 'absolute';
    currentWrapper.style.width = '100%';
    currentWrapper.style.top = '0';
    currentWrapper.style.left = '0';
    currentWrapper.innerHTML = container.innerHTML;
    
    const newWrapper = document.createElement('div');
    newWrapper.style.position = 'absolute';
    newWrapper.style.width = '100%';
    newWrapper.style.top = '0';
    newWrapper.style.left = xStart;
    newWrapper.innerHTML = newContent;
    
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.appendChild(currentWrapper);
    container.appendChild(newWrapper);
    
    const slideOut = currentWrapper.animate(
      [
        { transform: 'translateX(0%)' },
        { transform: `translateX(${direction === 'left' ? '-100%' : '100%'})` }
      ],
      {
        duration: this.animationDuration,
        easing: 'ease-in-out'
      }
    );
    
    const slideIn = newWrapper.animate(
      [
        { transform: `translateX(${direction === 'left' ? '100%' : '-100%'})` },
        { transform: 'translateX(0%)' }
      ],
      {
        duration: this.animationDuration,
        easing: 'ease-in-out'
      }
    );
    
    await Promise.all([slideOut.finished, slideIn.finished]);
    
    container.innerHTML = newContent;
    container.style.position = '';
    container.style.overflow = '';
    
    return Promise.resolve();
  }
  
  async zoomTransition(container, newContent) {
    if (this.supportsViewTransition) {
      return this._viewTransition(container, newContent, 'zoom');
    }
    
    // Fallback to Web Animations API
    const zoomOut = container.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.8)', opacity: 0 }
      ],
      {
        duration: this.animationDuration,
        easing: 'ease-out'
      }
    );
    
    await zoomOut.finished;
    container.innerHTML = newContent;
    
    const zoomIn = container.animate(
      [
        { transform: 'scale(1.2)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      {
        duration: this.animationDuration,
        easing: 'ease-in'
      }
    );
    
    return zoomIn.finished;
  }
  
  async flipTransition(container, newContent) {
    if (this.supportsViewTransition) {
      return this._viewTransition(container, newContent, 'flip');
    }
    
    // Fallback to Web Animations API
    container.style.perspective = '1000px';
    
    const flipOut = container.animate(
      [
        { transform: 'rotateY(0deg)', opacity: 1 },
        { transform: 'rotateY(90deg)', opacity: 0.5 }
      ],
      {
        duration: this.animationDuration / 2,
        easing: 'ease-in'
      }
    );
    
    await flipOut.finished;
    container.innerHTML = newContent;
    
    const flipIn = container.animate(
      [
        { transform: 'rotateY(-90deg)', opacity: 0.5 },
        { transform: 'rotateY(0deg)', opacity: 1 }
      ],
      {
        duration: this.animationDuration / 2,
        easing: 'ease-out'
      }
    );
    
    await flipIn.finished;
    container.style.perspective = '';
    
    return Promise.resolve();
  }
  
  // New method using View Transition API
  async _viewTransition(container, newContent, type, options = {}) {
    if (!this.supportsViewTransition) {
      container.innerHTML = newContent;
      return Promise.resolve();
    }
    
    // Add CSS for the specific transition type
    this._addTransitionStyles(type, options);
    
    try {
      return document.startViewTransition(() => {
        // This callback must be synchronous
        container.innerHTML = newContent;
      }).finished;
    } catch (error) {
      console.error('View Transition failed:', error);
      // Fallback if transition fails
      container.innerHTML = newContent;
      return Promise.resolve();
    }
  }
    // Simple method to initiate a page transition effect
  start() {
    // Get the main content container
    const mainContent = document.querySelector('main') || document.getElementById('mainContent') || document.body;
    
    // Apply a simple fade-in animation
    if (mainContent) {
      mainContent.style.opacity = '0';
      setTimeout(() => {
        mainContent.style.transition = 'opacity 300ms ease-in';
        mainContent.style.opacity = '1';
      }, 10);
    }
    
    return Promise.resolve();
  }
  
  _addTransitionStyles(type, options = {}) {
    // Remove any existing transition styles
    const existingStyle = document.getElementById('view-transition-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    let css = '';
    
    switch (type) {
      case 'fade':
        css = `
          ::view-transition-old(root) {
            animation: ${this.animationDuration}ms ease-out both fade-out;
          }
          ::view-transition-new(root) {
            animation: ${this.animationDuration}ms ease-in both fade-in;
          }
          @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `;
        break;
        
      case 'slide':
        const direction = options.direction || 'left';
        const oldTransform = direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
        const newTransform = direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
        
        css = `
          ::view-transition-old(root) {
            animation: ${this.animationDuration}ms ease-in-out both slide-out-${direction};
          }
          ::view-transition-new(root) {
            animation: ${this.animationDuration}ms ease-in-out both slide-in-${direction};
          }
          @keyframes slide-out-${direction} {
            from { transform: translateX(0); }
            to { transform: ${oldTransform}; }
          }
          @keyframes slide-in-${direction} {
            from { transform: ${newTransform}; }
            to { transform: translateX(0); }
          }
        `;
        break;
        
      case 'zoom':
        css = `
          ::view-transition-old(root) {
            animation: ${this.animationDuration}ms ease-out both zoom-out;
          }
          ::view-transition-new(root) {
            animation: ${this.animationDuration}ms ease-in both zoom-in;
          }
          @keyframes zoom-out {
            from { transform: scale(1); opacity: 1; }
            to { transform: scale(0.8); opacity: 0; }
          }
          @keyframes zoom-in {
            from { transform: scale(1.2); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `;
        break;
        
      case 'flip':
        css = `
          ::view-transition {
            perspective: 1000px;
          }
          ::view-transition-old(root) {
            animation: ${this.animationDuration / 2}ms ease-in both flip-out;
          }
          ::view-transition-new(root) {
            animation: ${this.animationDuration / 2}ms ease-out both flip-in;
            animation-delay: ${this.animationDuration / 2}ms;
          }
          @keyframes flip-out {
            from { transform: rotateY(0deg); opacity: 1; }
            to { transform: rotateY(90deg); opacity: 0.5; }
          }
          @keyframes flip-in {
            from { transform: rotateY(-90deg); opacity: 0.5; }
            to { transform: rotateY(0deg); opacity: 1; }
          }
        `;
        break;
    }
    
    // Add the styles to the document
    const styleElement = document.createElement('style');
    styleElement.id = 'view-transition-styles';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }
}

export default new PageTransition();
