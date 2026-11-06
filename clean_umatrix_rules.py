#!/usr/bin/env python3
import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from datetime import datetime

class UMatrixCleanerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("uMatrix Rules Cleaner")
        self.root.geometry("600x500")

        # Data
        self.filename = None
        self.original_lines = []
        self.domain_lines = {}      # domain -> list of line indices
        self.all_domains = []       # list of domains (ordered)
        self.check_vars = []        # IntVar per domain
        self.check_buttons = []     # references for possible later use

        # Mode: 'include' or 'exclude'
        self.mode_var = tk.StringVar(value="include")

        # --- Widgets ---

        # Top frame: file load and mode
        top_frame = ttk.Frame(root, padding=5)
        top_frame.pack(fill=tk.X)

        ttk.Button(top_frame, text="Load Rules File", command=self.load_file).pack(side=tk.LEFT, padx=5)
        self.file_label = ttk.Label(top_frame, text="No file loaded")
        self.file_label.pack(side=tk.LEFT, padx=10)

        # Mode radio buttons
        mode_frame = ttk.Frame(top_frame)
        mode_frame.pack(side=tk.RIGHT)
        ttk.Radiobutton(mode_frame, text="Include (delete selected)", variable=self.mode_var, value="include").pack(side=tk.LEFT)
        ttk.Radiobutton(mode_frame, text="Exclude (delete others)", variable=self.mode_var, value="exclude").pack(side=tk.LEFT)

        # List frame with scrollbar
        list_frame = ttk.Frame(root, padding=5)
        list_frame.pack(fill=tk.BOTH, expand=True)

        # Canvas and scrollbar for checkboxes
        self.canvas = tk.Canvas(list_frame, borderwidth=0)
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=scrollbar.set)

        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bottom buttons
        bottom_frame = ttk.Frame(root, padding=5)
        bottom_frame.pack(fill=tk.X)

        ttk.Button(bottom_frame, text="Select All", command=self.select_all).pack(side=tk.LEFT, padx=5)
        ttk.Button(bottom_frame, text="Deselect All", command=self.deselect_all).pack(side=tk.LEFT, padx=5)
        ttk.Button(bottom_frame, text="Save Cleaned File", command=self.save_file).pack(side=tk.LEFT, padx=5)
        ttk.Button(bottom_frame, text="Quit", command=root.quit).pack(side=tk.RIGHT, padx=5)

        self.status_label = ttk.Label(root, text="Ready", relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.pack(fill=tk.X, side=tk.BOTTOM, ipady=2)

    def load_file(self):
        """Open file dialog, read the rules, and populate the checklist."""
        filename = filedialog.askopenfilename(
            title="Select uMatrix rules file",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )
        if not filename:
            return

        self.filename = filename
        self.file_label.config(text=os.path.basename(filename))

        try:
            with open(filename, 'r', encoding='utf-8') as f:
                self.original_lines = f.readlines()
        except Exception as e:
            messagebox.showerror("Error", f"Could not read file:\n{e}")
            return

        # Parse domain-specific rules
        self.domain_lines.clear()
        self.all_domains.clear()

        for idx, line in enumerate(self.original_lines):
            stripped = line.strip()
            if not stripped:
                continue
            parts = stripped.split()
            if len(parts) < 3:
                continue
            first = parts[0]
            if ':' in first or first == '*':
                continue
            if '.' in first:
                if first not in self.domain_lines:
                    self.domain_lines[first] = []
                    self.all_domains.append(first)
                self.domain_lines[first].append(idx)

        if not self.all_domains:
            messagebox.showinfo("No domains", "No domain-specific rules found in this file.")
            return

        # Clear existing checkbuttons
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        self.check_vars.clear()
        self.check_buttons.clear()

        # Create checkbuttons for each domain
        for i, dom in enumerate(self.all_domains):
            count = len(self.domain_lines[dom])
            var = tk.IntVar(value=0)   # unchecked by default
            self.check_vars.append(var)
            cb = ttk.Checkbutton(
                self.scrollable_frame,
                text=f"{dom} ({count} rules)",
                variable=var
            )
            cb.grid(row=i, column=0, sticky="w", padx=2, pady=1)
            self.check_buttons.append(cb)

        self.status_label.config(text=f"Loaded {len(self.all_domains)} domains. Select domains and choose mode.")

    def select_all(self):
        for var in self.check_vars:
            var.set(1)

    def deselect_all(self):
        for var in self.check_vars:
            var.set(0)

    def save_file(self):
        """Apply selection and mode, then save a new file."""
        if not self.filename:
            messagebox.showwarning("No file", "Please load a rules file first.")
            return

        selected_domains = []
        for i, var in enumerate(self.check_vars):
            if var.get() == 1:
                selected_domains.append(self.all_domains[i])

        if not selected_domains:
            if messagebox.askyesno("No selection", "No domains selected. Continue (this will delete nothing if Include, or delete all if Exclude)?"):
                pass
            else:
                return

        mode = self.mode_var.get()
        remove_indices = set()

        if mode == "include":
            # Delete selected domains
            for dom in selected_domains:
                remove_indices.update(self.domain_lines[dom])
            action_desc = f"Deleted {len(remove_indices)} rules from selected domains."
        else:  # exclude
            # Delete all EXCEPT selected domains
            all_domain_indices = set()
            for indices in self.domain_lines.values():
                all_domain_indices.update(indices)
            keep_indices = set()
            for dom in selected_domains:
                keep_indices.update(self.domain_lines[dom])
            remove_indices = all_domain_indices - keep_indices
            action_desc = f"Kept {len(keep_indices)} rules from selected domains, deleted {len(remove_indices)} others."

        # Build new filename
        dirname = os.path.dirname(self.filename)
        basename = os.path.basename(self.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = os.path.join(dirname, f"{timestamp}_{basename}")

        # Write filtered lines
        try:
            with open(new_filename, 'w', encoding='utf-8') as f:
                for idx, line in enumerate(self.original_lines):
                    if idx not in remove_indices:
                        f.write(line)
        except Exception as e:
            messagebox.showerror("Save Error", f"Could not save file:\n{e}")
            return

        self.status_label.config(text=f"Saved: {os.path.basename(new_filename)}  |  {action_desc}")
        messagebox.showinfo("Success", f"File saved as:\n{new_filename}\n\n{action_desc}")

if __name__ == "__main__":
    root = tk.Tk()
    app = UMatrixCleanerGUI(root)
    root.mainloop()