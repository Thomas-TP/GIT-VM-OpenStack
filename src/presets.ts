// A VM request is composed of three independent choices:
//   performance (flavor) × storage (root disk) × OS (image).
// Performance (flavor cpu/ram) and storage (root disk size) are independent: VMs
// boot from a Cinder volume created from the image (boot-from-volume), so the disk
// can be ANY size. The flavor used is the diskless variant `${stem}-disk0` and the
// root volume is sized to storage.sizeGb at launch time (see openstack.ts).
// Prices are approximate hourly rates for Infomaniak Public Cloud (dc3-a), CHF≈USD.

export interface PerfPreset {
  id: string;
  label: string;
  /** Flavor name stem (cpu/ram part), combined with the storage size at launch. */
  flavorStem: string;
  vcpu: number;
  ramGb: number;
  hourlyUsd: number;
  description?: string;
  recommended?: boolean;
  /** Kept for resolving existing requests but hidden from the picker. */
  hidden?: boolean;
}
export interface StoragePreset {
  id: string;
  label: string;
  sizeGb: number;
  description?: string;
  recommended?: boolean;
  hidden?: boolean;
}
export interface OsPreset {
  id: string;
  label: string;
  /** Distribution family — drives the icon/colour in the picker. */
  family: 'ubuntu' | 'debian' | 'amazon' | 'rocky' | 'alma' | 'fedora' | 'centos' | 'suse' | 'windows';
  /** Glance image UUID (Infomaniak dc3-a). Field kept named `ami` to avoid churn. */
  ami: string;
  /** Login user for SSH. For Windows this is the RDP user (Administrator). */
  sshUser: string;
  /** How the user connects to the machine. */
  connect: 'ssh' | 'rdp';
  description?: string;
  recommended?: boolean;
  /** Minimum root disk for this OS (Windows needs ≥ 30 Go). */
  minStorageGb?: number;
  /** Kept for resolving existing requests but hidden from the picker. */
  hidden?: boolean;
}

// Performance tiers map to an Infomaniak flavor "stem" (cpu/ram). The disk size
// comes from the STORAGE choice, so the final flavor is `${stem}-disk${sizeGb}-perf1`.
// Legacy ids (eco/std/perf/pro/max) are kept hidden and remapped so any old
// request still resolves to a valid flavor.
// All Infomaniak general-purpose flavor stems that have disk 20/50/80 variants
// (verified via openstack-discover.mjs). The picker shows them all.
export const PERF: Record<string, PerfPreset> = {
  micro: { id: 'micro', label: 'Micro · 1 vCPU · 2 Go', flavorStem: 'a1-ram2', vcpu: 1, ramGb: 2, hourlyUsd: 0.012, description: 'Tests légers, scripts, apprentissage.' },
  nano4: { id: 'nano4', label: '1 vCPU · 4 Go', flavorStem: 'a1-ram4', vcpu: 1, ramGb: 4, hourlyUsd: 0.018, description: 'Léger, plus de mémoire.' },
  small: { id: 'small', label: 'Small · 2 vCPU · 4 Go', flavorStem: 'a2-ram4', vcpu: 2, ramGb: 4, hourlyUsd: 0.024, description: 'Dev, petits services, la plupart des cours.', recommended: true },
  flex: { id: 'flex', label: 'Flex · 4 vCPU · 8 Go', flavorStem: 'a4-ram8', vcpu: 4, ramGb: 8, hourlyUsd: 0.048, description: 'Confortable (Windows, conteneurs).' },
  big16: { id: 'big16', label: '4 vCPU · 16 Go', flavorStem: 'a4-ram16', vcpu: 4, ramGb: 16, hourlyUsd: 0.072, description: 'Mémoire confortable.' },
  cpu8: { id: 'cpu8', label: '8 vCPU · 16 Go', flavorStem: 'a8-ram16', vcpu: 8, ramGb: 16, hourlyUsd: 0.096, description: 'Calcul / build parallèle.' },
  cpu8ram32: { id: 'cpu8ram32', label: '8 vCPU · 32 Go', flavorStem: 'a8-ram32', vcpu: 8, ramGb: 32, hourlyUsd: 0.144, description: 'Calcul + grosse mémoire.' },
  cpu12: { id: 'cpu12', label: '12 vCPU · 24 Go', flavorStem: 'a12-ram24', vcpu: 12, ramGb: 24, hourlyUsd: 0.168, description: 'Charge soutenue.' },
  cpu12ram48: { id: 'cpu12ram48', label: '12 vCPU · 48 Go', flavorStem: 'a12-ram48', vcpu: 12, ramGb: 48, hourlyUsd: 0.24, description: 'Charge soutenue + mémoire.' },
  cpu16: { id: 'cpu16', label: '16 vCPU · 32 Go', flavorStem: 'a16-ram32', vcpu: 16, ramGb: 32, hourlyUsd: 0.224, description: 'Gros calcul.' },
  cpu16ram64: { id: 'cpu16ram64', label: '16 vCPU · 64 Go', flavorStem: 'a16-ram64', vcpu: 16, ramGb: 64, hourlyUsd: 0.32, description: 'Maximum — gros calcul + 64 Go.' },
  // Legacy (hidden) — remappés vers un stem valide pour les demandes existantes.
  eco: { id: 'eco', label: 'Eco', flavorStem: 'a1-ram2', vcpu: 1, ramGb: 2, hourlyUsd: 0.012, hidden: true },
  std: { id: 'std', label: 'Standard', flavorStem: 'a2-ram4', vcpu: 2, ramGb: 4, hourlyUsd: 0.024, hidden: true },
  perf: { id: 'perf', label: 'Performance', flavorStem: 'a4-ram8', vcpu: 4, ramGb: 8, hourlyUsd: 0.048, hidden: true },
  pro: { id: 'pro', label: 'Pro', flavorStem: 'a4-ram8', vcpu: 4, ramGb: 8, hourlyUsd: 0.048, hidden: true },
  max: { id: 'max', label: 'Max', flavorStem: 'a8-ram16', vcpu: 8, ramGb: 16, hourlyUsd: 0.096, hidden: true },
};

// Storage = root Cinder volume size (boot-from-volume), so any size is allowed
// (quota: 50 TB / 500 volumes). Windows images need ≥ 60 Go → gated to ≥ 80 Go.
export const STORAGE: Record<string, StoragePreset> = {
  s20: { id: 's20', label: '20 Go SSD', sizeGb: 20, description: 'Suffisant pour un OS Linux + outils.', recommended: true },
  s50: { id: 's50', label: '50 Go SSD', sizeGb: 50, description: 'Confortable pour la plupart des projets.' },
  s80: { id: 's80', label: '80 Go SSD', sizeGb: 80, description: 'Windows, ou Linux avec de gros outils.' },
  s160: { id: 's160', label: '160 Go SSD', sizeGb: 160, description: 'Gros volumes de données.' },
  s320: { id: 's320', label: '320 Go SSD', sizeGb: 320, description: 'Très gros stockage.' },
  s500: { id: 's500', label: '500 Go SSD', sizeGb: 500, description: 'Maximum proposé.' },
};

// All `ami` values are concrete Infomaniak Glance image UUIDs (dc3-a), discovered
// via `node scripts/openstack-discover.mjs`. Refresh them if images are retired.
// Note: Amazon Linux & AlmaLinux aren't offered by Infomaniak — replaced
// by additional Ubuntu/Debian/Rocky options (all with well-known cloud users).
// One entry per distro (no duplicates) — newest version of each, with its known
// cloud-init login user. UUIDs from openstack-discover.mjs (dc3-a).
export const OS: Record<string, OsPreset> = {
  ubuntu2404: { id: 'ubuntu2404', label: 'Ubuntu 24.04 LTS', family: 'ubuntu', ami: '59f6d446-584e-444f-8e05-62eaacf6817d', sshUser: 'ubuntu', connect: 'ssh', description: 'La distribution Linux la plus répandue. Idéale pour débuter.', recommended: true },
  debian13: { id: 'debian13', label: 'Debian 13 (Trixie)', family: 'debian', ami: '2dc5c057-94c5-4b3a-977d-ef7318724c48', sshUser: 'debian', connect: 'ssh', description: 'Stable et légère, la référence des serveurs.' },
  rocky9: { id: 'rocky9', label: 'Rocky Linux 9', family: 'rocky', ami: 'ea418e54-cd99-4d60-a561-12f12607eb9b', sshUser: 'rocky', connect: 'ssh', description: 'Compatible RHEL, parfaite pour l’entreprise (dnf/yum).' },
  fedora42: { id: 'fedora42', label: 'Fedora 42', family: 'fedora', ami: 'baa30a40-610e-482b-8c3d-2a2451745e2d', sshUser: 'fedora', connect: 'ssh', description: 'À la pointe (paquets récents), amont de RHEL.' },
  centos9: { id: 'centos9', label: 'CentOS Stream 9', family: 'centos', ami: 'eefd0e20-d8d7-431a-8e44-21064462ba23', sshUser: 'cloud-user', connect: 'ssh', description: 'Amont de RHEL (dnf). Connexion SSH : cloud-user.' },
  // openSUSE Leap 16 image doesn't reliably accept the injected key under a known
  // SSH user (login fell back to password) — hidden until its login user is verified.
  opensuse: { id: 'opensuse', label: 'openSUSE Leap 16', family: 'suse', ami: '175a10b7-f468-41ed-835c-a2bc2d451418', sshUser: 'opensuse', connect: 'ssh', hidden: true },
  windows2022: { id: 'windows2022', label: 'Windows Server 2022', family: 'windows', ami: 'd9b42bf9-34a9-44ca-81d7-b5ce52239a96', sshUser: 'Administrator', connect: 'rdp', minStorageGb: 60, description: 'Édition serveur : rôles, services, Active Directory, IIS. Accès RDP.' },
  // « Poste de travail » : Windows Server 2025 avec expérience Bureau (GUI complet via RDP).
  windowsDesktop: { id: 'windowsDesktop', label: 'Windows · Poste de travail', family: 'windows', ami: 'a3dd20e2-52e6-4f0c-915a-0c448909f5ef', sshUser: 'Administrator', connect: 'rdp', minStorageGb: 60, description: 'Bureau Windows complet (Windows Server 2025, expérience Bureau). Accès RDP.' },
  // Hidden legacy / dédupliqués — conservés masqués pour résoudre d'anciennes demandes.
  ubuntu2204: { id: 'ubuntu2204', label: 'Ubuntu 22.04 LTS', family: 'ubuntu', ami: '98c7b1cd-920f-4989-9227-d3af73ee53d8', sshUser: 'ubuntu', connect: 'ssh', hidden: true },
  debian12: { id: 'debian12', label: 'Debian 12 (Bookworm)', family: 'debian', ami: 'c03b8f35-78e9-40dc-9208-9625c2a98756', sshUser: 'debian', connect: 'ssh', hidden: true },
  al2023: { id: 'al2023', label: 'Amazon Linux 2023', family: 'amazon', ami: 'ea418e54-cd99-4d60-a561-12f12607eb9b', sshUser: 'rocky', connect: 'ssh', hidden: true },
  alma9: { id: 'alma9', label: 'AlmaLinux 9', family: 'alma', ami: 'ea418e54-cd99-4d60-a561-12f12607eb9b', sshUser: 'rocky', connect: 'ssh', hidden: true },
};

// Bundles d'outils par cours, préinstallés sur la VM via cloud-init au premier
// démarrage. MULTI-DISTRO : le header détecte apt / dnf / yum (Ubuntu/Debian ET
// Amazon Linux / Rocky / Alma) et expose `pm` qui installe chaque paquet
// individuellement, tolérant (on passe les noms apt ET dnf, le mauvais est ignoré).
// Les gros outils cloud/devops passent par leurs installeurs officiels (binaires,
// distro-agnostiques). Windows = Chocolatey (buildWindowsCourseInstall).
export interface CoursePreset {
  id: string;
  label: string;
  description: string;
  tools: string[];
  install: string;
}

export const COURSE_SCRIPT_HEADER = [
  '#!/bin/bash',
  'set -x',
  'if command -v apt-get >/dev/null 2>&1; then',
  '  export DEBIAN_FRONTEND=noninteractive; apt-get update -y || true',
  '  pm() { for p in "$@"; do apt-get install -y "$p" || true; done; }',
  'elif command -v dnf >/dev/null 2>&1; then',
  '  dnf install -y dnf-plugins-core || true',
  '  pm() { for p in "$@"; do dnf install -y "$p" || true; done; }',
  'elif command -v yum >/dev/null 2>&1; then',
  '  pm() { for p in "$@"; do yum install -y "$p" || true; done; }',
  'else',
  '  pm() { :; }',
  'fi',
].join('\n');

// Cross-distro installers (apt & dnf systems, x86_64).
const DOCKER = 'curl -fsSL https://get.docker.com | sh || true';
const KUBECTL = 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && install -m 0755 kubectl /usr/local/bin/kubectl || true';
const HELM = 'curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash || true';
const MINIKUBE = 'curl -Lo /usr/local/bin/minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x /usr/local/bin/minikube || true';
const TERRAFORM = 'pm unzip; curl -fsSL https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip -o /tmp/tf.zip && unzip -o /tmp/tf.zip -d /usr/local/bin/ || true';
const AWSCLI = 'pm unzip; curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/aws.zip && unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install || true';
const GCLOUD = 'curl -sSL https://sdk.cloud.google.com | bash || true';
const NODE = 'if command -v apt-get >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y nodejs; else curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash - && (dnf install -y nodejs || yum install -y nodejs); fi || true';
const AZURE = 'if command -v apt-get >/dev/null 2>&1; then curl -sL https://aka.ms/InstallAzureCLIDeb | bash; else rpm --import https://packages.microsoft.com/keys/microsoft.asc && dnf install -y https://packages.microsoft.com/config/rhel/9/packages-microsoft-prod.rpm && dnf install -y azure-cli; fi || true';
const pip = (pkgs: string) => `python3 -m pip install --break-system-packages ${pkgs} 2>/dev/null || python3 -m pip install ${pkgs} || true`;

export const COURSES: Record<string, CoursePreset> = {
  cloud: {
    id: 'cloud',
    label: 'Cloud & DevOps',
    description: 'Azure CLI, AWS CLI, Google Cloud CLI, Terraform, kubectl, Docker, Helm, Ansible.',
    tools: ['Azure CLI', 'AWS CLI', 'gcloud', 'Terraform', 'kubectl', 'Docker', 'Helm', 'Ansible'],
    install: [
      'pm git curl unzip ca-certificates python3 python3-pip',
      DOCKER, AZURE, AWSCLI, GCLOUD, TERRAFORM, KUBECTL, HELM,
      `pm ansible; command -v ansible >/dev/null 2>&1 || ${pip('ansible')}`,
    ].join('\n'),
  },
  web: {
    id: 'web',
    label: 'Développement Web',
    description: 'Node.js LTS, npm, Git, Nginx, Python 3, build-essential.',
    tools: ['Node.js LTS', 'npm', 'Git', 'Nginx', 'Python 3', 'build-essential'],
    install: [
      'pm git nginx python3 python3-pip build-essential gcc gcc-c++ make',
      NODE,
    ].join('\n'),
  },
  data: {
    id: 'data',
    label: 'Data Science & IA',
    description: 'Python 3, Jupyter, NumPy, pandas, matplotlib, scikit-learn, R.',
    tools: ['Python 3', 'Jupyter', 'NumPy', 'pandas', 'matplotlib', 'scikit-learn', 'R'],
    install: [
      'pm python3 python3-pip python3-venv r-base R',
      pip('jupyter numpy pandas matplotlib scikit-learn seaborn'),
    ].join('\n'),
  },
  containers: {
    id: 'containers',
    label: 'Conteneurs & Kubernetes',
    description: 'Docker, kubectl, minikube, Helm, k9s.',
    tools: ['Docker', 'kubectl', 'minikube', 'Helm', 'k9s'],
    install: [DOCKER, KUBECTL, MINIKUBE, HELM].join('\n'),
  },
  cyber: {
    id: 'cyber',
    label: 'Cybersécurité',
    description: 'nmap, tshark, hydra, john, tcpdump, nikto, net-tools, whois, dnsutils.',
    tools: ['nmap', 'tshark', 'hydra', 'john', 'tcpdump', 'nikto', 'net-tools', 'whois'],
    install: ['pm nmap tshark wireshark-cli hydra john tcpdump nikto net-tools whois dnsutils bind-utils'].join('\n'),
  },
  db: {
    id: 'db',
    label: 'Bases de données',
    description: 'PostgreSQL, MariaDB (MySQL), Redis, SQLite.',
    tools: ['PostgreSQL', 'MariaDB', 'Redis', 'SQLite'],
    install: ['pm postgresql postgresql-server mariadb-server mariadb redis redis-server sqlite sqlite3'].join('\n'),
  },
  sysadmin: {
    id: 'sysadmin',
    label: 'Système & Réseau',
    description: 'net-tools, tcpdump, nmap, htop, tmux, rsync, iperf3, traceroute, vim.',
    tools: ['net-tools', 'tcpdump', 'nmap', 'htop', 'tmux', 'rsync', 'iperf3', 'traceroute'],
    install: ['pm net-tools tcpdump nmap htop tmux rsync openssh-client openssh-clients iperf3 traceroute vim'].join('\n'),
  },
  cpp: {
    id: 'cpp',
    label: 'Programmation C / C++',
    description: 'gcc, g++, gdb, make, cmake, valgrind, build-essential.',
    tools: ['gcc', 'g++', 'gdb', 'make', 'cmake', 'valgrind'],
    install: ['pm build-essential gcc gcc-c++ make gdb cmake valgrind'].join('\n'),
  },
  java: {
    id: 'java',
    label: 'Java',
    description: 'OpenJDK 17, Maven, Gradle.',
    tools: ['OpenJDK 17', 'Maven', 'Gradle'],
    install: ['pm openjdk-17-jdk java-17-openjdk java-17-openjdk-devel maven gradle'].join('\n'),
  },
  python: {
    id: 'python',
    label: 'Python',
    description: 'Python 3, pip, venv, pipx, IPython, Jupyter.',
    tools: ['Python 3', 'pip', 'venv', 'pipx', 'IPython', 'Jupyter'],
    install: [
      'pm python3 python3-pip python3-venv pipx',
      pip('ipython jupyter'),
    ].join('\n'),
  },
};

// A course value is '' or a comma-separated list of known course ids (multi-select).
export const courseIds = (v: string | null | undefined): string[] =>
  (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
export const isValidCourse = (id: string) =>
  id === '' || courseIds(id).every((c) => Object.prototype.hasOwnProperty.call(COURSES, c));

// cloud-init user-data installing the tools of one or more courses (Linux only).
// undefined if none. Multiple courses share one header, installs concatenated.
export function buildCourseUserData(course: string | null | undefined): string | undefined {
  const installs = courseIds(course).map((id) => COURSES[id]?.install).filter(Boolean) as string[];
  if (!installs.length) return undefined;
  return `${COURSE_SCRIPT_HEADER}\n${installs.join('\n')}\n`;
}

// Windows (Chocolatey) package mapping per course — best effort equivalents.
const COURSE_WIN: Record<string, string> = {
  cloud: 'git azure-cli awscli gcloudsdk terraform kubernetes-cli kubernetes-helm docker-cli docker-engine',
  web: 'git nodejs-lts nginx python',
  data: 'python r.project',
  containers: 'docker-cli docker-engine kubernetes-cli minikube kubernetes-helm',
  cyber: 'nmap wireshark',
  db: 'postgresql sqlite',
  sysadmin: 'nmap wireshark putty sysinternals',
  cpp: 'mingw cmake',
  java: 'temurin17 maven gradle',
  python: 'python',
};

// PowerShell that installs Chocolatey then the courses' tools (Windows). undefined if none.
// Merges the Chocolatey packages of all selected courses (de-duplicated).
export function buildWindowsCourseInstall(course: string | null | undefined): string | undefined {
  const pkgs = [...new Set(courseIds(course).flatMap((id) => (COURSE_WIN[id] ?? '').split(' ').filter(Boolean)))].join(' ');
  if (!pkgs) return undefined;
  return [
    "Set-ExecutionPolicy Bypass -Scope Process -Force",
    "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072",
    "iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))",
    `choco install -y --no-progress ${pkgs}`,
  ].join('\n');
}

// On Infomaniak the root disk is bundled into the flavor price; this small
// per-GB figure keeps the estimate roughly proportional to disk size.
export const STORAGE_USD_GB_MONTH = 0.02;
const HOURS_PER_MONTH = 730;

export const isValidPerf = (id: string) => Object.prototype.hasOwnProperty.call(PERF, id);
export const isValidStorage = (id: string) => Object.prototype.hasOwnProperty.call(STORAGE, id);
export const isValidOs = (id: string) => Object.prototype.hasOwnProperty.call(OS, id);

// Approximate monthly cost if the VM runs 24/7.
export function estimateMonthlyUsd(perfId: string, storageId: string): number {
  const p = PERF[perfId];
  const s = STORAGE[storageId];
  if (!p || !s) return 0;
  return p.hourlyUsd * HOURS_PER_MONTH + s.sizeGb * STORAGE_USD_GB_MONTH;
}
