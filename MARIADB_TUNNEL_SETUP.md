# MariaDB Tunnel Setup Guide for OlymPOS

Your MariaDB database is accessible locally via HeidiSQL but not from this cloud environment. Here are connection options:

## Option 1: SSH Tunnel (Recommended)

### Prerequisites
- SSH access to your local machine
- MariaDB running on 127.0.0.1:3306

### Setup Steps
1. **Enable SSH on your local machine** (if not already enabled)
2. **Create SSH tunnel** from your local machine:
   ```bash
   ssh -R 3306:127.0.0.1:3306 user@your-server-ip
   ```
3. **Update OlymPOS connection** to use tunnel endpoint

## Option 2: Expose MariaDB Remotely

### Security Warning
Only do this temporarily and secure your database properly.

### Steps
1. **Edit MariaDB config** (my.cnf or my.ini):
   ```ini
   [mysqld]
   bind-address = 0.0.0.0
   ```
2. **Create remote user**:
   ```sql
   CREATE USER 'olympos_remote'@'%' IDENTIFIED BY 'secure_password_here';
   GRANT ALL PRIVILEGES ON olympos.* TO 'olympos_remote'@'%';
   FLUSH PRIVILEGES;
   ```
3. **Open port 3306** in your firewall
4. **Update OlymPOS config** with your external IP

## Option 3: Database Export/Import

1. **Export your olympos database**:
   ```bash
   mysqldump -u root -p olympos > olympos_backup.sql
   ```
2. **Import to cloud MariaDB instance**
3. **Update OlymPOS connection string**

## Current Status

OlymPOS is configured to connect to:
- Host: 127.0.0.1
- Port: 3306
- Database: olympos
- User: root
- Password: pa0k0l31

Which option would you prefer to implement?