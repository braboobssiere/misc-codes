#!/bin/bash

# Install JPEXS Free Flash Decompiler
wget https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version22.0.1/ffdec_22.0.1.zip
unzip ffdec_22.0.1.zip -d jpexs

# Decompile SWF file
mkdir -p decompiled
java -jar jpexs/ffdec.jar -export all decompiled flash/zilch.swf

# Move files to the 'flash' directory
mv decompiled/* flash/

# Create a ZIP archive of the decompiled assets
zip -r flash/decompiled_assets.zip flash/
