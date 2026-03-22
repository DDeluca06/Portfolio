import type { ResumeData } from '$lib/utils/types';

export const resumeData: ResumeData = {
  basics: {
    name: "Demitri DeLuca-Lyons",
    headline: "Software Engineer & Infrastructure Architect",
    email: "ddelucalyons@gmail.com",
    phone: "(215) 645-2081",
    location: "Philadelphia, PA",
    summary: "Dedicated Software Engineer with a strong foundation in full-stack development, IT systems administration, and infrastructure automation. Proven ability to build scalable applications using SvelteKit and Next.js, while also configuring and maintaining enterprise-grade homelab infrastructure with Docker Swarm. Passionate about leveraging technology, including innovative AI solutions, to enhance operational efficiency and drive positive business outcomes."
  },
  profiles: [
    {
      network: "LinkedIn",
      username: "Demitri DeLuca-Lyons",
      url: "https://www.linkedin.com/in/demitri-deluca-lyons-747312319/",
      icon: "linkedin"
    },
    {
      network: "GitHub",
      username: "DDeluca06",
      url: "https://github.com/DDeluca06",
      icon: "github"
    }
  ],
  experience: [
    {
      id: "launchpad",
      company: "Launchpad Philly",
      position: "Associate",
      location: "Philadelphia, PA",
      period: "January 2024 - Present",
      description: [
        "Provided technical assistance and communicated effectively with team members to ensure timely resolution of IT issues and successful project completion",
        "Offered direct technical support, troubleshooting and resolving complex issues related to system access, application functionality, and technology adoption",
        "Developed comprehensive technical documentation and quickstart guides, streamlining IT processes and facilitating user adoption",
        "Configured, optimized, and maintained hardware and software across a fleet of 30+ machines to ensure consistent system performance",
        "Spearheaded an OS imaging and redeployment pipeline, streamlining provisioning for new and repurposed devices",
        "Designed and prototyped an internal Large Language Model (LLM) to enhance data retrieval and support data-driven decision-making"
      ],
      highlights: ["30+ machines", "OS imaging pipeline", "LLM prototyping"]
    },
    {
      id: "seer",
      company: "Seer Interactive",
      position: "AI & Innovation Intern",
      location: "Philadelphia, PA",
      period: "October 2025 - December 2025",
      description: [
        "Implemented a robust and secure Google Cloud Compute solution to host critical services, including AI applications",
        "Established a production-ready system with a secure web interface",
        "Integrated with OpenAI compatible endpoints and data tools like Ninjacat to facilitate secure, client-specific data queries"
      ],
      highlights: ["Google Cloud", "OpenAI integration", "Production deployment"]
    }
  ],
  education: [
    {
      school: "Furness High School",
      location: "Philadelphia, PA",
      period: "August 2020 - June 2024",
      description: "Student Council, major technology assistant"
    }
  ],
  certifications: [
    {
      title: "PCEP-30-02",
      issuer: "Python Institute",
      date: "August 2024",
      description: "Certified Entry-Level Python Programmer"
    }
  ],
  skills: {
    development: [
      { name: "SvelteKit", level: 90, category: "Frontend" },
      { name: "Next.js", level: 85, category: "Frontend" },
      { name: "React", level: 85, category: "Frontend" },
      { name: "TypeScript", level: 80, category: "Languages" },
      { name: "JavaScript", level: 90, category: "Languages" },
      { name: "Python", level: 85, category: "Languages" },
      { name: "HTML5/CSS3", level: 90, category: "Frontend" },
      { name: "Node.js", level: 80, category: "Backend" },
      { name: "PostgreSQL", level: 75, category: "Backend" },
      { name: "Git", level: 85, category: "Tools" }
    ],
    infrastructure: [
      { name: "Docker", level: 90, category: "DevOps" },
      { name: "Docker Swarm", level: 85, category: "DevOps" },
      { name: "Linux", level: 85, category: "Systems" },
      { name: "Ubuntu Server", level: 85, category: "Systems" },
      { name: "Windows Server", level: 75, category: "Systems" },
      { name: "Cloudflare", level: 80, category: "Networking" },
      { name: "Traefik", level: 75, category: "Networking" },
      { name: "TCP/IP", level: 80, category: "Networking" },
      { name: "n8n", level: 85, category: "Automation" },
      { name: "SEO", level: 70, category: "Marketing" }
    ],
    ai: [
      { name: "Prompt Engineering", level: 90, category: "AI" },
      { name: "OpenAI API", level: 85, category: "AI" },
      { name: "Claude", level: 90, category: "AI" },
      { name: "Ollama", level: 80, category: "AI" },
      { name: "OpenWebUI", level: 75, category: "AI" },
      { name: "LLM Deployment", level: 80, category: "AI" }
    ]
  }
};
