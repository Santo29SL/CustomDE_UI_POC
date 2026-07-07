import { Component, OnInit, OnDestroy, signal, inject, computed, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, EditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly gatewayUrl = 'http://localhost:5050/api';

  // Navigation & Modal state
  readonly currentTab = signal<string>('ingest');
  readonly settingsModalOpen = signal<boolean>(false);

  // Project Initializer signals
  readonly projectModalOpen = signal<boolean>(false);
  readonly projectInitMode = signal<string>('new');
  readonly newProjectName = signal<string>('');
  readonly selectedExistingProject = signal<string>('');

  // Configuration settings signals
  readonly projectName = signal<string>('my_project');
  readonly workspacePath = signal<string>('');
  readonly executionMode = signal<string>('docker');
  readonly dockerContainerName = signal<string>('cranky_faraday');
  readonly postgresUri = signal<string>('');
  readonly mongoUri = signal<string>('');
  readonly mysqlHost = signal<string>('localhost');
  readonly mysqlPort = signal<string>('3306');
  readonly mysqlUser = signal<string>('root');
  readonly mysqlPassword = signal<string>('password');
  readonly mysqlDatabase = signal<string>('mysqldb');
  readonly mageUrl = signal<string>('http://localhost:6789/api');
  readonly mageApiKey = signal<string>('');
  readonly supersetUrl = signal<string>('http://localhost:8088/superset/dashboard/1/?standalone=true');

  readonly safeSupersetUrl = computed<SafeResourceUrl>(() => {
    const url = this.supersetUrl();
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // Ingestion views parameters
  readonly selectedSourceType = signal<string>('mongodb');
  readonly ingestTableName = signal<string>('users');
  readonly ingesting = signal<boolean>(false);
  readonly ingestionProgress = signal<number>(0);
  readonly ingestionLogs = signal<string[]>([]);
  readonly selectedFile = signal<File | null>(null);
  readonly selectedFileSizeStr = signal<string>('');

  // Notebook editor signals
  readonly fileTree = signal<FileNode[]>([]);
  readonly selectedFilePath = signal<string>('');
  readonly editorCode = signal<string>('# Select a file to edit, or write code here...');
  readonly editorLanguage = signal<string>('python');
  readonly executing = signal<boolean>(false);
  readonly terminalLogs = signal<string>('Terminal ready. Click "Run Code" or press Ctrl+Enter to execute.');
  readonly sqlResults = signal<any[]>([]);
  readonly activeTerminalTab = signal<string>('terminal');
  readonly dbTables = signal<any[]>([]);

  // Monaco Editor Options
  readonly editorOptions = signal<any>({
    theme: 'vs',
    language: 'python',
    automaticLayout: true,
    fontSize: 14,
    lineNumbers: 'on',
    minimap: { enabled: false },
    fontFamily: "'Fira Code', 'Courier New', monospace"
  });

  // Resizing terminal height
  readonly terminalHeight = signal<number>(180);
  isResizing = false;
  private startY = 0;
  private startHeight = 0;

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
    this.startY = event.clientY;
    this.startHeight = this.terminalHeight();

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.stopResize);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.isResizing) return;
    const deltaY = event.clientY - this.startY;
    const newHeight = Math.max(100, Math.min(600, this.startHeight - deltaY));
    this.terminalHeight.set(newHeight);
  };

  stopResize = () => {
    this.isResizing = false;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.stopResize);
  };

  ngOnDestroy() {
    this.stopResize();
  }

  // Pipelines Lineage signals
  readonly pipelines = signal<any[]>([]);
  readonly selectedPipeline = signal<any>(null);
  readonly pipelineRunning = signal<boolean>(false);
  readonly pipelineLogs = signal<string>('');
  newPipelineName = '';



  ngOnInit() {
    this.loadConfiguration();
  }

  // Load backend configurations
  loadConfiguration() {
    this.http.get<any>(`${this.gatewayUrl}/metadata`).subscribe({
      next: (config) => {
        if (config) {
          this.projectName.set(config.projectName || 'my_project');
          this.workspacePath.set(config.workspacePath || '');
          this.executionMode.set(config.executionMode || 'docker');
          this.dockerContainerName.set(config.dockerContainerName || 'cranky_faraday');
          this.postgresUri.set(config.postgresUri || '');
          this.mongoUri.set(config.mongoUri || '');
          this.mysqlHost.set(config.mysqlHost || 'localhost');
          this.mysqlPort.set(config.mysqlPort || '3306');
          this.mysqlUser.set(config.mysqlUser || 'root');
          this.mysqlPassword.set(config.mysqlPassword || 'password');
          this.mysqlDatabase.set(config.mysqlDatabase || 'mysqldb');
          this.mageUrl.set(config.mageUrl || '');
          this.mageApiKey.set(config.mageApiKey || '');
          this.supersetUrl.set(config.supersetUrl || 'http://localhost:8088/superset/dashboard/1/?standalone=true');
          
          // Once config is loaded, call secondary workspace queries
          this.loadWorkspaceFiles();
          this.loadDbTables();
          this.loadPipelines();
        }
      },
      error: (err) => {
        console.error('Failed to load configs. Operating in simulated offline mode.', err);
        this.loadWorkspaceFiles();
      }
    });
  }

  // Save config settings
  saveSettings() {
    const payload = {
      projectName: this.projectName(),
      workspacePath: this.workspacePath(),
      executionMode: this.executionMode(),
      dockerContainerName: this.dockerContainerName(),
      postgresUri: this.postgresUri(),
      mongoUri: this.mongoUri(),
      mysqlHost: this.mysqlHost(),
      mysqlPort: this.mysqlPort(),
      mysqlUser: this.mysqlUser(),
      mysqlPassword: this.mysqlPassword(),
      mysqlDatabase: this.mysqlDatabase(),
      mageUrl: this.mageUrl(),
      mageApiKey: this.mageApiKey(),
      supersetUrl: this.supersetUrl()
    };

    this.http.post<any>(`${this.gatewayUrl}/metadata`, payload).subscribe({
      next: (res) => {
        this.settingsModalOpen.set(false);
        this.loadWorkspaceFiles();
        this.loadDbTables();
        this.loadPipelines();
        alert('Configuration saved successfully!');
      },
      error: (err) => {
        alert('Save settings failed: ' + err.message);
      }
    });
  }

  saveSettingsSilently() {
    const payload = {
      projectName: this.projectName(),
      workspacePath: this.workspacePath(),
      executionMode: this.executionMode(),
      dockerContainerName: this.dockerContainerName(),
      postgresUri: this.postgresUri(),
      mongoUri: this.mongoUri(),
      mysqlHost: this.mysqlHost(),
      mysqlPort: this.mysqlPort(),
      mysqlUser: this.mysqlUser(),
      mysqlPassword: this.mysqlPassword(),
      mysqlDatabase: this.mysqlDatabase(),
      mageUrl: this.mageUrl(),
      mageApiKey: this.mageApiKey(),
      supersetUrl: this.supersetUrl()
    };

    this.http.post<any>(`${this.gatewayUrl}/metadata`, payload).subscribe({
      error: (err) => console.error('Silent save failed:', err)
    });
  }

  setTab(tab: string) {
    this.currentTab.set(tab);
    if (tab === 'pipelines') {
      this.loadPipelines();
    }
  }

  selectSourceType(type: string) {
    this.selectedSourceType.set(type);
    if (type !== 'localfile') {
      alert(`Please check your settings configuration to ensure your connection details are correct for ${type === 'mongodb' ? 'MongoDB' : 'MySQL'}.`);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      const sizeKB = (file.size / 1024).toFixed(2);
      this.selectedFileSizeStr.set(`${sizeKB} KB`);
      
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanTableName = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      this.ingestTableName.set(cleanTableName);
    } else {
      this.selectedFile.set(null);
      this.selectedFileSizeStr.set('');
    }
  }

  // ==========================================
  // INGESTION METHODS
  // ==========================================

  readonly existingProjects = signal<string[]>([]);

  loadExistingProjects() {
    this.http.get<string[]>(`${this.gatewayUrl}/workspace/projects`).subscribe({
      next: (data) => {
        this.existingProjects.set(data || []);
      },
      error: () => {
        this.existingProjects.set(['es', 'healthcare']);
      }
    });
  }

  initializeProjectSchema() {
    this.newProjectName.set('');
    this.loadExistingProjects();
    this.projectModalOpen.set(true);
    
    setTimeout(() => {
      const existing = this.existingProjects();
      if (existing.length > 0) {
        this.selectedExistingProject.set(existing[0]);
      } else {
        this.selectedExistingProject.set('');
      }
    }, 150);
  }

  submitProjectInitialization() {
    let name = "";
    if (this.projectInitMode() === 'new') {
      name = this.newProjectName().trim();
      if (!name) {
        alert("Please enter a new project name.");
        return;
      }
    } else {
      name = this.selectedExistingProject();
      if (!name) {
        alert("Please select an existing project folder.");
        return;
      }
    }

    this.http.post<any>(`${this.gatewayUrl}/project/initialize`, { ProjectName: name }).subscribe({
      next: (res) => {
        this.projectName.set(name);
        this.projectModalOpen.set(false);
        alert(res.message);
        alert("Please check your settings configuration to ensure all connection details are correct for this project.");
        this.loadDbTables();
        this.loadWorkspaceFiles();
        this.loadPipelines();
      },
      error: (err) => {
        alert('Initialization failed: ' + (err.error?.message || err.message));
      }
    });
  }

  initIngestionScript() {
    const table = this.ingestTableName().trim();
    if (!table) {
      alert("Please enter a collection or table name to ingest.");
      return;
    }

    if (this.selectedSourceType() === 'localfile' && !this.selectedFile()) {
      alert("Please select a CSV or Parquet file to upload.");
      return;
    }

    // Auto-save the currently entered MySQL database details before generating the ingestion script
    this.saveSettingsSilently();

    this.ingesting.set(true);
    this.ingestionProgress.set(0);

    if (this.selectedSourceType() === 'localfile') {
      this.ingestionLogs.set([
        "[INFO] Starting manual file ingestion...",
        `[INFO] Uploading file '${this.selectedFile()?.name}' to gateway backend...`
      ]);

      const file = this.selectedFile()!;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tableName', table);

      // Simple progress simulation for upload
      const interval = setInterval(() => {
        const current = this.ingestionProgress();
        if (current < 50) {
          this.ingestionProgress.set(current + 10);
        }
      }, 100);

      this.http.post<any>(`${this.gatewayUrl}/ingest/upload`, formData).subscribe({
        next: (uploadRes) => {
          clearInterval(interval);
          this.ingestionProgress.set(50);
          this.ingestionLogs.update(logs => [
            ...logs,
            `[SUCCESS] File uploaded and saved to host path: ${uploadRes.filePath}`,
            "[INFO] Creating Python ETL Ingestion code mapping for Medallion architecture..."
          ]);

          const initPayload = {
            SourceType: 'localfile',
            TableName: table,
            FileExtension: uploadRes.fileExtension
          };

          const initInterval = setInterval(() => {
            const current = this.ingestionProgress();
            if (current < 95) {
              this.ingestionProgress.set(current + 10);
            }
          }, 100);

          this.http.post<any>(`${this.gatewayUrl}/ingest/initialize`, initPayload).subscribe({
            next: (res) => {
              clearInterval(initInterval);
              this.ingestionProgress.set(100);
              setTimeout(() => {
                this.ingesting.set(false);
                this.ingestionProgress.set(0);
                this.selectedFile.set(null); // Clear selected file
                this.selectedFileSizeStr.set('');
                this.ingestionLogs.update(logs => [
                  ...logs,
                  `[SUCCESS] Python script initialized successfully: ${res.filename}`,
                  `[INFO] Directing to Notebook tab. Click 'Run Code' inside Monaco to start loading data.`
                ]);
                
                // Reload files tree and auto open this generated script
                this.loadWorkspaceFiles();
                this.loadPipelines();
                this.setTab('notebook');
                setTimeout(() => {
                  this.openFileByPath(`my_mage_project/${res.filename}`);
                }, 300);
              }, 300);
            },
            error: (err) => {
              clearInterval(initInterval);
              this.ingesting.set(false);
              this.ingestionProgress.set(0);
              this.ingestionLogs.update(logs => [...logs, `[ERROR] Script generation failed: ${err.message}`]);
            }
          });
        },
        error: (err) => {
          clearInterval(interval);
          this.ingesting.set(false);
          this.ingestionProgress.set(0);
          this.ingestionLogs.update(logs => [...logs, `[ERROR] File upload failed: ${err.error?.message || err.message}`]);
        }
      });
    } else {
      // Original logic for mongodb and mysql
      const payload = {
        SourceType: this.selectedSourceType(),
        TableName: table
      };

      this.ingestionLogs.set(["[INFO] Generating Python ETL Ingestion code mapping for Medallion architecture..."]);

      // Simulated progress increment
      const interval = setInterval(() => {
        const current = this.ingestionProgress();
        if (current < 90) {
          this.ingestionProgress.set(current + 15);
        }
      }, 100);

      this.http.post<any>(`${this.gatewayUrl}/ingest/initialize`, payload).subscribe({
        next: (res) => {
          clearInterval(interval);
          this.ingestionProgress.set(100);
          setTimeout(() => {
            this.ingesting.set(false);
            this.ingestionProgress.set(0);
            this.ingestionLogs.update(logs => [
              ...logs,
              `[SUCCESS] Python script initialized successfully: ${res.filename}`,
              `[INFO] Directing to Notebook tab. Click 'Run Code' inside Monaco to start loading data.`
            ]);
            
            // Reload files tree and auto open this generated script
            this.loadWorkspaceFiles();
            this.loadPipelines();
            this.setTab('notebook');
            setTimeout(() => {
              this.openFileByPath(`my_mage_project/${res.filename}`);
            }, 300);
          }, 300);
        },
        error: (err) => {
          clearInterval(interval);
          this.ingesting.set(false);
          this.ingestionProgress.set(0);
          this.ingestionLogs.update(logs => [...logs, `[ERROR] Script generation failed: ${err.message}`]);
        }
      });
    }
  }

  // ==========================================
  // FILE BROWSER & MONACO notebook logic
  // ==========================================

  loadWorkspaceFiles() {
    this.http.get<any>(`${this.gatewayUrl}/workspace/files`).subscribe({
      next: (data) => {
        let list: FileNode[] = [];
        if (data && data.files && Array.isArray(data.files)) {
          list = data.files;
        } else if (Array.isArray(data)) {
          list = data;
        }
        this.fileTree.set(list);
      },
      error: () => {
        // Simulated file tree structure fallback
        const proj = this.projectName().toLowerCase().replace(/\s+/g, '_') || 'my_project';
        this.fileTree.set([
          {
            name: 'my_mage_project',
            type: 'directory',
            isOpen: true,
            children: [
              {
                name: proj,
                type: 'directory',
                isOpen: true,
                children: [
                  { name: 'bronze', type: 'directory', isOpen: true, children: [] },
                  { name: 'silver', type: 'directory', isOpen: true, children: [] },
                  { name: 'gold', type: 'directory', isOpen: true, children: [] }
                ]
              }
            ]
          }
        ]);
      }
    });
  }

  selectFileNode(path: string, node: FileNode) {
    if (node.type === 'directory') {
      node.isOpen = !node.isOpen;
      return;
    }

    this.selectedFilePath.set(path);
    this.editorLanguage.set(node.language || 'python');
    this.editorOptions.set({
      ...this.editorOptions(),
      language: node.language === 'pyspark' ? 'python' : node.language
    });

    this.http.get<any>(`${this.gatewayUrl}/workspace/file?filename=${path}`).subscribe({
      next: (res) => {
        this.editorCode.set(res.content);
        this.terminalLogs.set(`Loaded file: ${node.name}. Click 'Run Code' or press Ctrl+Enter to compile.`);
        this.sqlResults.set([]);
      },
      error: () => {
        this.editorCode.set('# Sample python script\nprint("Write code here...")');
        this.terminalLogs.set(`Template loaded for ${node.name}. Ready to execute.`);
      }
    });
  }

  changeLanguage(lang: string) {
    this.editorLanguage.set(lang);
    this.editorOptions.set({
      ...this.editorOptions(),
      language: lang === 'pyspark' ? 'python' : lang
    });
  }

  saveFile() {
    if (!this.selectedFilePath()) {
      alert('Please select a file to save first.');
      return;
    }

    const payload = {
      filename: this.selectedFilePath(),
      code: this.editorCode()
    };

    this.http.post<any>(`${this.gatewayUrl}/workspace/file`, payload).subscribe({
      next: (res) => {
        this.terminalLogs.update(logs => `${logs}\n[INFO] File saved successfully.`);
        this.loadPipelines(); // Reload DAG on save in case dependencies or block filenames changed!
      },
      error: (err) => {
        alert('Save failed: ' + err.message);
      }
    });
  }

  createNewFilePrompt() {
    const filename = prompt("Enter new filename relative to workspace (e.g. bronze/orders.sql, silver/stg_orders.sql, gold/sales_by_time_metrics.sql):");
    if (!filename) return;

    let starterCode = "";
    if (filename.endsWith(".py")) {
      starterCode = "# Python Medallion Block\ndef run_step():\n    print(\"Running step...\")\n";
    } else if (filename.endsWith(".sql")) {
      starterCode = "-- SQL Medallion Block\nSELECT * FROM source_table;\n";
    } else {
      starterCode = "";
    }

    const proj = this.projectName().toLowerCase().replace(/\s+/g, '_');
    let targetPath = filename;
    if (!filename.startsWith(proj + "/")) {
      targetPath = proj + "/" + filename;
    }

    const payload = {
      filename: "my_mage_project/" + targetPath,
      code: starterCode
    };

    this.http.post<any>(`${this.gatewayUrl}/workspace/file`, payload).subscribe({
      next: () => {
        this.loadWorkspaceFiles();
        this.loadPipelines(); // Dynamically updates the DAG lineage chart!
        this.openFileByPath("my_mage_project/" + targetPath);
        this.terminalLogs.set(`[INFO] Created new file: ${filename}`);
      },
      error: (err) => {
        alert("Error creating file: " + err.message);
      }
    });
  }

  renameFilePrompt(filePath: string) {
    if (!filePath) return;
    
    // Default to the current filename without the "my_mage_project/" prefix
    let displayPath = filePath;
    if (displayPath.startsWith("my_mage_project/")) {
      displayPath = displayPath.substring("my_mage_project/".length);
    }
    
    const newFilename = prompt("Enter new filename relative to workspace (e.g. bronze/my_file.py):", displayPath);
    if (!newFilename || newFilename === displayPath) return;

    const payload = {
      oldFilename: filePath,
      newFilename: "my_mage_project/" + newFilename
    };

    this.http.post<any>(`${this.gatewayUrl}/workspace/rename`, payload).subscribe({
      next: (res) => {
        this.loadWorkspaceFiles();
        this.loadPipelines();
        
        // If the renamed file is the currently open file, reopen it under the new path
        if (this.selectedFilePath() === filePath) {
          this.openFileByPath("my_mage_project/" + newFilename);
        }
        this.terminalLogs.set(`[INFO] Renamed file successfully to: ${newFilename}`);
      },
      error: (err) => {
        alert("Error renaming file: " + err.message);
      }
    });
  }

  deleteFilePrompt(filePath: string) {
    if (!filePath) return;

    let displayPath = filePath;
    if (displayPath.startsWith("my_mage_project/")) {
      displayPath = displayPath.substring("my_mage_project/".length);
    }

    if (!confirm(`Are you sure you want to delete ${displayPath}? This action cannot be undone.`)) {
      return;
    }

    this.http.delete<any>(`${this.gatewayUrl}/workspace/file?filename=${filePath}`).subscribe({
      next: (res) => {
        this.loadWorkspaceFiles();
        this.loadPipelines();

        // If the deleted file was the currently open file, clear the editor
        if (this.selectedFilePath() === filePath) {
          this.selectedFilePath.set('');
          this.editorCode.set('# Select a file to edit, or write code here...');
        }
        this.terminalLogs.set(`[INFO] Deleted file successfully: ${displayPath}`);
      },
      error: (err) => {
        alert("Error deleting file: " + err.message);
      }
    });
  }

  runCode() {
    if (this.executing()) return;

    this.executing.set(true);
    this.terminalLogs.set('[INFO] Executing script code runtime sequence...\n[INFO] Initializing environment bindings...');

    const payload = {
      fileName: this.selectedFilePath() || 'scratchpad.py',
      code: this.editorCode(),
      language: this.editorLanguage()
    };

    this.http.post<any>(`${this.gatewayUrl}/workspace/execute`, payload).subscribe({
      next: (res) => {
        this.executing.set(false);
        this.terminalLogs.set(res.message);
        if (res.data) {
          this.sqlResults.set(res.data);
          this.activeTerminalTab.set('preview');
        } else {
          this.sqlResults.set([]);
        }
        this.loadDbTables();
      },
      error: (err) => {
        this.executing.set(false);
        this.terminalLogs.set(`[ERROR] Code execution failed: ${err.message || 'Connection lost'}`);
        this.sqlResults.set([]);
      }
    });
  }

  // ==========================================
  // SCHEMA DISCOVERY & preview grid
  // ==========================================

  loadDbTables() {
    this.http.get<any[]>(`${this.gatewayUrl}/workspace/postgres-tables`).subscribe({
      next: (data) => {
        this.dbTables.set(data || []);
      },
      error: () => {
        console.error('Failed to load database table list.');
      }
    });
  }

  getTablesInSchema(schema: string): any[] {
    const proj = this.projectName().toLowerCase().replace(/\s+/g, '_');
    return this.dbTables().filter(t => t.schemaName === `${proj}_${schema}` || t.schemaName === schema);
  }

  getDynamicColumns(): string[] {
    const results = this.sqlResults();
    if (results && results.length > 0) {
      return Object.keys(results[0]);
    }
    return [];
  }

  previewDbTable(schema: string, table: string) {
    this.activeTerminalTab.set('preview');
    this.terminalLogs.set(`[INFO] Fetching top 10 preview rows from database table ${schema}.${table}...`);
    
    this.http.post<any[]>(`${this.gatewayUrl}/workspace/preview`, { SchemaName: schema, TableName: table }).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.sqlResults.set(res);
          this.terminalLogs.set(`Successfully loaded data preview for table: ${schema}.${table}`);
        } else {
          this.sqlResults.set([]);
          this.terminalLogs.set(`Table ${schema}.${table} is empty or query returned no data.`);
        }
      },
      error: (err) => {
        this.sqlResults.set([]);
        this.terminalLogs.set(`Error loading table preview: ${err.message}`);
      }
    });
  }

  deleteDbTable(schema: string, table: string) {
    if (!confirm(`Are you sure you want to drop database table "${schema}.${table}"? This will permanently delete all records inside it.`)) {
      return;
    }
    
    this.http.delete<any>(`${this.gatewayUrl}/workspace/postgres-table?schemaName=${schema}&tableName=${table}`).subscribe({
      next: (res) => {
        this.loadDbTables();
        this.terminalLogs.set(`[SUCCESS] Dropped database table successfully: ${schema}.${table}`);
        // If we were previewing this table, clear preview
        this.sqlResults.set([]);
      },
      error: (err) => {
        alert("Failed to drop database table: " + (err.error?.message || err.message));
      }
    });
  }

  openFileForTable(schema: string, tableName: string) {
    const proj = this.projectName().toLowerCase().replace(/\s+/g, '_');
    let layerName = schema;
    if (schema.startsWith(proj + "_")) {
      layerName = schema.substring(proj.length + 1);
    }
    
    let path = `my_mage_project/${proj}/${layerName}/${tableName}.sql`;
    this.openFileByPath(path);
  }

  openFileByPath(targetPath: string) {
    const result = this.findFileNodeByPath(this.fileTree(), targetPath);
    if (result) {
      this.selectFileNode(result.fullPath, result.node);
    } else {
      // Direct load mapping if node structure is not built
      const name = targetPath.split('/').pop() || 'scratchpad.py';
      this.selectFileNode(targetPath, { name, type: 'file', language: name.endsWith('.sql') ? 'sql' : 'python' });
    }
  }

  findFileNodeByPath(nodes: FileNode[], targetPath: string, parentPath = ''): { node: FileNode, fullPath: string } | null {
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      if (node.type === 'file' && currentPath === targetPath) {
        return { node, fullPath: currentPath };
      }
      if (node.type === 'directory' && node.children) {
        const result = this.findFileNodeByPath(node.children, targetPath, currentPath);
        if (result) {
          node.isOpen = true;
          return result;
        }
      }
    }
    return null;
  }

  // ==========================================
  // PIPELINE LINEAGE DAG FLOW
  // ==========================================

  readonly dagEdges = signal<any[]>([]);

  @HostListener('window:resize')
  onResize() {
    this.updateDagConnections();
  }

  loadPipelines() {
    this.http.get<any>(`${this.gatewayUrl}/pipelines`).subscribe({
      next: (res) => {
        this.pipelines.set(res.pipelines || []);
        if (res.pipelines && res.pipelines.length > 0) {
          this.selectedPipeline.set(res.pipelines[0]);
          this.updateDagConnections();
        }
      },
      error: () => {
        console.error('Failed to load pipelines list.');
      }
    });
  }

  selectPipeline(pipeline: any) {
    this.selectedPipeline.set(pipeline);
    this.pipelineLogs.set(`Selected pipeline: ${pipeline.name}.\nReady for DAG run execution.`);
    this.updateDagConnections();
  }

  updateDagConnections() {
    const pipeline = this.selectedPipeline();
    if (!pipeline || !pipeline.blocks) {
      this.dagEdges.set([]);
      return;
    }

    // Wait a tiny bit for the DOM to render
    setTimeout(() => {
      const canvasEl = document.getElementById('dag-canvas');
      if (!canvasEl) return;
      const canvasRect = canvasEl.getBoundingClientRect();

      const edges: any[] = [];

      for (const block of pipeline.blocks) {
        if (!block.upstream_blocks) continue;
        
        const targetNodeEl = document.getElementById(`node-${block.uuid}`);
        if (!targetNodeEl) continue;
        const targetRect = targetNodeEl.getBoundingClientRect();

        for (const upstreamUuid of block.upstream_blocks) {
          const sourceNodeEl = document.getElementById(`node-${upstreamUuid}`);
          if (!sourceNodeEl) continue;
          const sourceRect = sourceNodeEl.getBoundingClientRect();

          // Calculate connection points:
          // From the right-center of the source node, to the left-center of the target node
          const x1 = sourceRect.right - canvasRect.left;
          const y1 = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
          
          const x2 = targetRect.left - canvasRect.left;
          const y2 = targetRect.top + targetRect.height / 2 - canvasRect.top;

          // Compute a nice cubic bezier curve path for the DAG line
          const controlOffset = Math.max(40, (x2 - x1) / 2);
          const path = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

          edges.push({
            path: path,
            uuid: `${upstreamUuid}-${block.uuid}`
          });
        }
      }

      this.dagEdges.set(edges);
    }, 150);
  }

  runPipeline() {
    const pipe = this.selectedPipeline();
    if (!pipe) return;

    this.pipelineRunning.set(true);
    this.pipelineLogs.set(`[INFO] Dispatching scheduler job queue trigger for pipeline DAG: ${pipe.name}...\n[INFO] Allocating resources...`);

    this.http.post<any>(`${this.gatewayUrl}/pipelines/${pipe.uuid}/run`, {}).subscribe({
      next: (res) => {
        this.pipelineRunning.set(false);
        this.pipelineLogs.set(res.message || 'Pipeline execution completed successfully.');
        this.loadDbTables();
      },
      error: (err) => {
        this.pipelineRunning.set(false);
        this.pipelineLogs.set(`[ERROR] Pipeline run failed: ${err.message}`);
      }
    });
  }

  getBlocksForSchema(layer: string): any[] {
    const pipeline = this.selectedPipeline();
    if (!pipeline || !pipeline.blocks) return [];
    
    if (layer === 'bronze') {
      return pipeline.blocks.filter((b: any) => b.type === 'data_loader');
    } else if (layer === 'silver') {
      return pipeline.blocks.filter((b: any) => b.type === 'transformer');
    } else if (layer === 'gold') {
      return pipeline.blocks.filter((b: any) => b.type === 'data_exporter');
    }
    return [];
  }

  onDagNodeClick(block: any) {
    if (!block) return;
    const targetPath = block.filePath || block.uuid;
    if (targetPath) {
      this.setTab('notebook');
      setTimeout(() => {
        this.openFileByPath(targetPath);
      }, 50);
    }
  }

  getNodeDisplayName(block: any): string {
    return block.name || block.uuid;
  }
}
