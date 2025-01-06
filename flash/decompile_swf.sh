#!/bin/bash

# Install JPEXS Free Flash Decompiler
wget https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version11.3.0/JPEXS-Free-Flash-Decompiler-11.3.0.zip
unzip JPEXS-Free-Flash-Decompiler-11.3.0.zip -d jpexs

# Decompile SWF file
mkdir -p decompiled
java -jar jpexs/JPEXS\ Free\ Flash\ Decompiler.jar -export script,shape,image,sound,text,video decompiled zilch.swf

# Move files to the 'flash' directory
mkdir -p flash
mv decompiled/* flash/

# Create a ZIP archive of the decompiled assets
zip -r flash/decompiled_assets.zip flash/
