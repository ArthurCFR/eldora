/**
 * FileUploader Component
 * Handles file uploads with preview and validation
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[]; // e.g., ['.xlsx', '.xls', '.csv']
  maxSizeMB?: number;
  disabled?: boolean;
}

export default function FileUploader({
  onFileSelect,
  acceptedTypes = ['.xlsx', '.xls'],
  maxSizeMB = 10,
  disabled = false,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(fileExtension)) {
      setError(`Type de fichier non supporté. Acceptés: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`Fichier trop volumineux. Maximum: ${maxSizeMB}MB`);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (event: any) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change
      handleFileChange({ target: { files: [file] } });
    }
  };

  const handleDragOver = (event: any) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <View style={styles.container}>
      {!selectedFile ? (
        <View
          style={[
            styles.uploadArea,
            isDragging && styles.uploadAreaDragging,
            disabled && styles.uploadAreaDisabled,
          ]}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={48}
            color={disabled ? colors.text.tertiary : colors.accent.gold}
          />
          <Text style={styles.uploadText}>
            Glissez un fichier ici ou cliquez pour sélectionner
          </Text>
          <Text style={styles.uploadSubtext}>
            Formats acceptés: {acceptedTypes.join(', ')} (max {maxSizeMB}MB)
          </Text>

          <input
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileChange}
            disabled={disabled}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
        </View>
      ) : (
        <View style={styles.filePreview}>
          <View style={styles.fileInfo}>
            <Ionicons name="document-text" size={32} color={colors.accent.gold} />
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                {(selectedFile.size / 1024).toFixed(2)} KB
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={removeFile} style={styles.removeButton}>
            <Ionicons name="close-circle" size={24} color={colors.accent.danger} />
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.accent.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
    position: 'relative',
    minHeight: 150,
  },
  uploadAreaDragging: {
    borderColor: colors.accent.gold,
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
  },
  uploadAreaDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  uploadSubtext: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  fileSize: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: borderRadius.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.accent.danger,
    flex: 1,
  },
});
