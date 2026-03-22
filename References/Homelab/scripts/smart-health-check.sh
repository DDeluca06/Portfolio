#!/bin/bash
#
# Weekly SMART Health Check Script
# Run on: server (192.168.50.115)
# Location: /opt/scripts/smart-health-check.sh
# Schedule: Weekly via cron (see crontab example below)
#

set -euo pipefail

DRIVE_MOUNTS=("/mnt/disk1" "/mnt/disk2" "/mnt/disk3" "/mnt/disk4")
OUTPUT_DIR="/DATA/Logs/smart-health"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date +'%H:%M:%S')] $*"
}

get_device_for_mount() {
    local mount_point="$1"
    local device=""
    
    device=$(lsblk -no pkname "$(df "$mount_point" 2>/dev/null | tail -1 | awk '{print $1}')" 2>/dev/null) || true
    
    if [[ -z "$device" ]]; then
        for dev in /dev/sd?; do
            if mountpoint -q "$mount_point" 2>/dev/null; then
                if [[ -b "$dev" ]]; then
                    if grep -q "$mount_point" /proc/mounts 2>/dev/null; then
                        device=$(basename "$dev")
                        break
                    fi
                fi
            fi
        done
    fi
    
    echo "$device"
}

check_drive() {
    local mount_point="$1"
    local drive_name
    drive_name=$(basename "$mount_point")
    
    log "Checking $drive_name..."
    
    local device
    device=$(get_device_for_mount "$mount_point")
    
    if [[ -z "$device" ]]; then
        echo "  Status: UNABLE TO DETECT DEVICE"
        return 1
    fi
    
    local dev_path="/dev/$device"
    if [[ ! -b "$dev_path" ]]; then
        dev_path="/dev/sg${device: -1}"
    fi
    
    local smart_output
    smart_output=$(smartctl -a -d sat "$dev_path" 2>&1) || smart_output=$(smartctl -a "$dev_path" 2>&1) || {
        echo "  Status: SMART NOT ACCESSIBLE"
        return 1
    }
    
    echo "$smart_output" > "$OUTPUT_DIR/${drive_name}-${DATE}.txt"
    
    local health
    health=$(echo "$smart_output" | grep -i "SMART overall-health" | awk '{print $NF}')
    
    local temp
    temp=$(echo "$smart_output" | grep "Temperature_Celsius" | awk '{print $10}' | head -1)
    [[ -z "$temp" ]] && temp=$(echo "$smart_output" | grep "Temperature:" | awk '{print $2}')
    
    local reallocated
    reallocated=$(echo "$smart_output" | grep "Reallocated_Sector_Ct" | awk '{print $10}')
    [[ -z "$reallocated" ]] && reallocated="0"
    
    local pending
    pending=$(echo "$smart_output" | grep "Current_Pending_Sector" | awk '{print $10}')
    [[ -z "$pending" ]] && pending="0"
    
    local unc_errors
    unc_errors=$(echo "$smart_output" | grep "Reported_Uncorrect\|Uncorrectable" | head -1 | awk '{print $10}')
    [[ -z "$unc_errors" ]] && unc_errors="0"
    
    local power_on_hours
    power_on_hours=$(echo "$smart_output" | grep "Power_On_Hours" | awk '{print $10}')
    
    local model
    model=$(echo "$smart_output" | grep "Device Model\|Model Family" | head -1 | awk -F: '{print $2}' | xargs)
    
    local status_icon="✅"
    if [[ "$health" != "PASSED" ]]; then
        status_icon="❌"
    elif [[ "$pending" -gt 0 ]] || [[ "$reallocated" -gt 100 ]]; then
        status_icon="⚠️"
    fi
    
    echo "  Status: $status_icon $health"
    echo "  Model: $model"
    echo "  Power-On Hours: $power_on_hours"
    echo "  Temperature: ${temp:-N/A}°C"
    echo "  Reallocated Sectors: $reallocated"
    echo "  Pending Sectors: $pending"
    echo "  Uncorrectable Errors: $unc_errors"
    
    if [[ "$pending" -gt 0 ]]; then
        echo "  ⚠️ WARNING: Pending sectors detected!"
    fi
    if [[ "$reallocated" -gt 100 ]]; then
        echo "  ⚠️ WARNING: High reallocated sector count!"
    fi
    
    return 0
}

echo "========================================="
echo "SMART Health Check - $TIMESTAMP"
echo "========================================="

overall_status="OK"

for mount in "${DRIVE_MOUNTS[@]}"; do
    echo ""
    echo ">>> $(basename "$mount")"
    if check_drive "$mount"; then
        :
    else
        overall_status="ISSUES"
    fi
done

echo ""
echo "========================================="
echo "Summary: $overall_status"
echo "========================================="
echo ""
echo "Full reports saved to: $OUTPUT_DIR"
echo ""

if [[ "$overall_status" != "OK" ]]; then
    exit 1
fi

exit 0
