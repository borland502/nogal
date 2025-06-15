#!/usr/bin/env bun
// filepath: /home/jhettenh/Development/nogal/main.ts

import { Command } from 'commander';
import { readFileSync, existsSync, statSync, unlinkSync, renameSync, mkdirSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

interface CategoryMap {
  [key: string]: string;
}

class NoGAL {
  private categoryMap: CategoryMap = {};
  private catverPath: string;

  constructor() {
    // Try to find catver.ini in same directory as executable
    let scriptDir: string;
    
    // For Bun standalone executables, process.execPath gives us the actual executable path
    if (import.meta.url.includes('$bunfs/root')) {
      // Running as standalone executable - use directory of the actual executable
      scriptDir = dirname(process.execPath);
    } else {
      // Running as source code
      scriptDir = dirname(fileURLToPath(import.meta.url));
    }
    
    this.catverPath = join(scriptDir, 'catver.ini');
    
    if (!existsSync(this.catverPath)) {
      console.error('Error: catver.ini not found in the same directory as the executable.');
      console.error(`Looked for: ${this.catverPath}`);
      process.exit(1);
    }
    
    this.loadCategoryMap();
  }

  private loadCategoryMap(): void {
    try {
      const content = readFileSync(this.catverPath, 'utf-8');
      const lines = content.split('\n');
      let inCategorySection = false;

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed === '[Category]') {
          inCategorySection = true;
          continue;
        }
        
        if (trimmed.startsWith('[') && trimmed !== '[Category]') {
          inCategorySection = false;
          continue;
        }
        
        if (inCategorySection && trimmed && !trimmed.startsWith(';')) {
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex > 0) {
            const rom = trimmed.substring(0, equalIndex);
            const category = trimmed.substring(equalIndex + 1);
            this.categoryMap[rom] = category;
          }
        }
      }
      
      // console.log(`Loaded ${Object.keys(this.categoryMap).length} entries from catver.ini`);
    } catch (error) {
      console.error('Error reading catver.ini:', error);
      process.exit(1);
    }
  }

  private async getRomFiles(directory: string): Promise<string[]> {
    try {
      const files = await readdir(directory);
      return files.filter(file => {
        const ext = extname(file).toLowerCase();
        return ['.zip', '.7z', '.chd'].includes(ext);
      });
    } catch (error) {
      console.error(`Error reading directory ${directory}:`, error);
      return [];
    }
  }

  private async getVideoFiles(directory: string, romName: string): Promise<string[]> {
    const videoDir = join(directory, 'video');
    
    if (!existsSync(videoDir)) {
      return [];
    }
    
    try {
      const files = await readdir(videoDir);
      const videoFiles = files.filter(file => {
        const baseName = basename(file, extname(file));
        // Look for files that match: <romName>-video.<extension>
        return baseName === `${romName}-video`;
      });
      
      return videoFiles.map(file => join(videoDir, file));
    } catch (error) {
      console.error(`Error reading video directory ${videoDir}:`, error);
      return [];
    }
  }

  private getRomName(filename: string): string {
    // Remove extension and return base name
    return basename(filename, extname(filename));
  }

  private matchesCategory(category: string, searchCategory: string, caseInsensitive: boolean): boolean {
    const categoryToCheck = caseInsensitive ? category.toLowerCase() : category;
    const searchCategoryToCheck = caseInsensitive ? searchCategory.toLowerCase() : searchCategory;
    
    return categoryToCheck.includes(searchCategoryToCheck);
  }

  private isMatureGame(category: string): boolean {
    return category.includes('* Mature *');
  }

  async listGames(options: {
    directory: string;
    category?: string;
    caseInsensitive?: boolean;
  }): Promise<void> {
    const { directory, category, caseInsensitive = false } = options;
    
    if (!existsSync(directory)) {
      console.error(`Directory not found: ${directory}`);
      return;
    }

    const romFiles = await this.getRomFiles(directory);
    const matchingGames: Array<{ filename: string; category: string }> = [];

    for (const file of romFiles) {
      const romName = this.getRomName(file);
      const gameCategory = this.categoryMap[romName];
      
      if (gameCategory) {
        let matches = false;
        
        if (category) {
          if (category.toLowerCase() === 'mature') {
            matches = this.isMatureGame(gameCategory);
          } else {
            matches = this.matchesCategory(gameCategory, category, caseInsensitive);
          }
        } else {
          // Default behavior: filter mature games
          matches = this.isMatureGame(gameCategory);
        }
        
        if (matches) {
          matchingGames.push({ filename: file, category: gameCategory });
        }
      }
    }

    if (matchingGames.length === 0) {
      console.log('No matching games found.');
      return;
    }

    console.log(`Found ${matchingGames.length} matching games:`);
    for (const game of matchingGames) {
      console.log(`${game.filename} - ${game.category}`);
    }
  }

  async deleteGames(options: {
    directory: string;
    category?: string;
    caseInsensitive?: boolean;
    backup?: string;
    deleteVideo?: boolean;
  }): Promise<void> {
    const { directory, category, caseInsensitive = false, backup, deleteVideo = false } = options;
    
    if (!existsSync(directory)) {
      console.error(`Directory not found: ${directory}`);
      return;
    }

    // If backup directory is specified, create it if it doesn't exist
    if (backup && !existsSync(backup)) {
      try {
        mkdirSync(backup, { recursive: true });
        console.log(`Created backup directory: ${backup}`);
      } catch (error) {
        console.error(`Error creating backup directory ${backup}:`, error);
        return;
      }
    }

    const romFiles = await this.getRomFiles(directory);
    const gamesToDelete: string[] = [];

    for (const file of romFiles) {
      const romName = this.getRomName(file);
      const gameCategory = this.categoryMap[romName];
      
      if (gameCategory) {
        let shouldDelete = false;
        
        if (category) {
          if (category.toLowerCase() === 'mature') {
            shouldDelete = this.isMatureGame(gameCategory);
          } else {
            shouldDelete = this.matchesCategory(gameCategory, category, caseInsensitive);
          }
        } else {
          // Default behavior: delete mature games
          shouldDelete = this.isMatureGame(gameCategory);
        }
        
        if (shouldDelete) {
          gamesToDelete.push(file);
        }
      }
    }

    if (gamesToDelete.length === 0) {
      console.log('No games to delete.');
      return;
    }

    console.log(`${backup ? 'Moving' : 'Deleting'} ${gamesToDelete.length} games...`);
    
    let successCount = 0;
    for (const file of gamesToDelete) {
      const sourcePath = join(directory, file);
      const romName = this.getRomName(file);
      
      try {
        // Handle ROM file
        if (backup) {
          const backupPath = join(backup, file);
          renameSync(sourcePath, backupPath);
          console.log(`Moved: ${file} -> ${backup}/`);
        } else {
          unlinkSync(sourcePath);
          console.log(`Deleted: ${file}`);
        }
        
        // Handle video files if flag is set
        if (deleteVideo) {
          const videoFiles = await this.getVideoFiles(directory, romName);
          for (const videoPath of videoFiles) {
            const videoFile = basename(videoPath);
            try {
              if (backup) {
                // Create video subdirectory in backup if it doesn't exist
                const backupVideoDir = join(backup, 'video');
                if (!existsSync(backupVideoDir)) {
                  mkdirSync(backupVideoDir, { recursive: true });
                }
                const backupVideoPath = join(backupVideoDir, videoFile);
                renameSync(videoPath, backupVideoPath);
                console.log(`Moved video: ${videoFile} -> ${backup}/video/`);
              } else {
                unlinkSync(videoPath);
                console.log(`Deleted video: ${videoFile}`);
              }
            } catch (videoError) {
              console.error(`Error ${backup ? 'moving' : 'deleting'} video ${videoFile}:`, videoError);
            }
          }
        }
        
        successCount++;
      } catch (error) {
        console.error(`Error ${backup ? 'moving' : 'deleting'} ${file}:`, error);
      }
    }
    
    console.log(`Successfully ${backup ? 'moved' : 'deleted'} ${successCount} games.`);
  }
}

function main() {
  const program = new Command();
  
  program
    .name('nogal')
    .description('NoGAL - MAME game purging tool')
    .version('1.0.0')
    .requiredOption('-d, --directory <path>', 'directory containing MAME files')
    .option('-c, --category <category>', 'category to filter (default: mature games)')
    .option('-i, --case-insensitive', 'case insensitive category matching')
    .option('-l, --list', 'list matching games instead of deleting them')
    .option('-o, --video', 'delete/move videos as well')
    .option('-b, --backup <path>', 'backup directory to move files instead of deleting')
    .action(async (options) => {
      const nogal = new NoGAL();
      
      if (options.list) {
        await nogal.listGames({
          directory: options.directory,
          category: options.category,
          caseInsensitive: options.caseInsensitive
        });
      } else {
        await nogal.deleteGames({
          directory: options.directory,
          category: options.category,
          caseInsensitive: options.caseInsensitive,
          backup: options.backup,
          deleteVideo: options.video
        });
      }
    });

  program.parse();
}

if (import.meta.main) {
  main();
}