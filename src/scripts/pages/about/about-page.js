export default class AboutPage {
  async render() {
    return `
      <section class="about-container">
        <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
        <h1 class="about-title">About Story App</h1>
        
        <div class="about-content">
          <p class="about-description">Story App is a platform where users can share their stories with photos and locations. This application was built as a project for Dicoding's Frontend Web Development course.</p>
          
          <div class="about-section">
            <h2 class="section-title">Features</h2>
            <ul class="feature-list">
              <li>View stories from other users</li>
              <li>See story locations on a map</li>
              <li>Add your own stories with photos</li>
              <li>Include location data with your stories</li>
            </ul>
          </div>
          
          <div class="about-section">
            <h2 class="section-title">Technologies Used</h2>
            <ul class="tech-list">
              <li><span class="tech-tag">HTML, CSS, and JavaScript</span></li>
              <li><span class="tech-tag">Leaflet for maps</span></li>
              <li><span class="tech-tag">Dicoding Story API</span></li>
              <li><span class="tech-tag">Web Components</span></li>
              <li><span class="tech-tag">Webpack</span></li>
            </ul>
          </div>
          
          <div class="about-section credits-section">
            <h2 class="section-title">Credits</h2>
            <p>Map data provided by <a href="https://www.openstreetmap.org/" class="credit-link">OpenStreetMap</a> contributors.</p>
            <p>API provided by <a href="https://www.dicoding.com/" class="credit-link">Dicoding Indonesia</a>.</p>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // Add the CSS styles when the component is rendered
    this.addStyles();
  }

  addStyles() {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .about-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      animation: fadeIn 0.8s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

      .visually-hidden {
        position: absolute;
        clip: rect(0 0 0 0);
        width: 1px;
        height: 1px;
        margin: -1px;
        overflow: hidden;
      }

      .about-title {
        font-size: 2.5rem;
        text-align: center;
        margin-bottom: 2rem;
        color: #2c3e50;
        border-bottom: 3px solid #3498db;
        padding-bottom: 0.5rem;
      }

      .about-description {
        font-size: 1.1rem;
        margin-bottom: 2rem;
        text-align: justify;
      }

      .about-section {
      margin-bottom: 2.5rem;
      opacity: 0;
      animation: sectionFadeIn 0.5s ease-in-out forwards;
      }
    .about-section:nth-child(1) { animation-delay: 0.2s; }
    .about-section:nth-child(2) { animation-delay: 0.4s; }
    .about-section:nth-child(3) { animation-delay: 0.6s; }

      @keyframes sectionFadeIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .section-title {
        font-size: 1.8rem;
        color: #2c3e50;
        margin-bottom: 1rem;
        padding-left: 0.5rem;
        border-left: 4px solid #3498db;
      }

      .feature-list, .tech-list {
        list-style-type: none;
        padding-left: 1rem;
      }

      .feature-list li, .tech-list li {
        margin-bottom: 0.75rem;
        position: relative;
        padding-left: 1.5rem;
      }

      .feature-list li:before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #27ae60;
        font-weight: bold;
      }

      .tech-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .tech-list li {
        padding-left: 0;
        margin-bottom: 0;
      }

      .tech-tag {
        background-color: #f1f8ff;
        border: 1px solid #add8e6;
        border-radius: 4px;
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        color: #0366d6;
        display: inline-block;
      }

      .credits-section {
        background-color: #f9f9f9;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .credits-section p {
        margin: 0.5rem 0;
      }

      .credit-link {
        color: #3498db;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
      }

      .credit-link:hover {
        color: #2980b9;
        text-decoration: underline;
      }

      @media (max-width: 768px) {
        .about-container {
          padding: 1.5rem;
        }
        
        .about-title {
          font-size: 2rem;
        }
        
        .section-title {
          font-size: 1.5rem;
        }
        
        .tech-list {
          gap: 0.5rem;
        }
      }
    `;
    document.head.appendChild(styleElement);
  }
}
