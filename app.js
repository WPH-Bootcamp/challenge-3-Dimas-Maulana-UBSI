const readline = require('readline');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

const rl = readline.createInterface({
       input: process.stdin,
       output: process.stdout
   });


const userProfile = {
    name: "Dimas Maulana",
    joinDate: new Date().toISOString(),
    totalHabits: 0,
    completedThisWeek: 0,

    updateStats(habits) {
        this.totalHabits = habits.length;
        this.completedThisWeek = habits.filter(h => h.isCompletedThisWeek()).length;
    },

    getDaysJoined() {
        const today = new Date();
        const joinDate = new Date(this.joinDate);
        const diffTime = today - joinDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
};

class Habit {
    #name
    #id
    #targetFrequency
    #completions
    #createdAt
    constructor(id, name, targetFrequency, completions = [], createdAt = null){
        this.#id = id;
        this.#name = name;
        this.#targetFrequency = targetFrequency;
        this.#completions = completions; 
        this.#createdAt = createdAt ?? new Date().toISOString();
    }

    get id(){
        return this.#id;
    }

    get name(){
        return this.#name;
    }

    set name(newName){
        if (newName.trim().length === 0)
            throw new Error("Nama tidak boleh kosong");
        this.#name = newName;
    }

    get targetFrequency(){
        return this.#targetFrequency;
    }

     get createdAt() {
        return this.#createdAt;
    }

    get completions() {
        return [...this.#completions];
    }

    markComplete(){
        const today = new Date().toISOString().split('T')[0]; 
        
        if (!this.#completions.includes(today)) {
            this.#completions.push(today);
            return true; 
        }
        return false;
    }

    getThisWeekCompletions() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - offset);
        startOfWeek.setHours(0, 0, 0, 0); 

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999); 

        return this.#completions.filter(dateStr => {
            const date = new Date(dateStr + 'T00:00:00'); 
            return date >= startOfWeek && date <= endOfWeek;
        });
    }


    isCompletedThisWeek() {
        return this.getThisWeekCompletions().length >= this.#targetFrequency;
    }

    getProgressPercentage() {
        const progress = this.getThisWeekCompletions().length;
        const target = this.#targetFrequency;
        const percentage = Math.min(Math.floor((progress / target) * 100), 100);

        const totalBar = 10;
        const filledBar = Math.floor(percentage / 10);
        const emptyBar = totalBar - filledBar;

        return `[${"█".repeat(filledBar)}${"░".repeat(emptyBar)}] ${percentage}%`;
    }


    getStatus() {
        return this.isCompletedThisWeek()
            ? "✅ Selesai"
            : "⏳ Belum Selesai";
    }

    toJSON() {
        return {
            id: this.#id,
            name: this.#name,
            targetFrequency: this.#targetFrequency,
            completions: this.#completions,
            createdAt: this.#createdAt
        };
    }

    static fromJSON(data) {
        return new Habit(
            data.id ?? 0,
            data.name ?? "Unnamed",
            data.targetFrequency ?? 1,
            data.completions ?? [],
            data.createdAt ?? new Date().toISOString()
        );
    }
};

class HabitTracker {

    habits;
    #userProfile;
    #reminderInterval;
    #dataFile

    constructor(dataFile){
        this.habits = [];
        this.#userProfile = userProfile;
        this.#reminderInterval = null;
        this.#dataFile = dataFile ?? DATA_FILE;
    }

    addHabit(name,frequency){
        const lastHabit = this.habits[this.habits.length - 1];
        const id = lastHabit ? lastHabit.id + 1 : 1;
        const newHabit = new Habit(id,name,frequency);
        this.habits.push(newHabit);
        this.#userProfile.updateStats(this.habits);
        this.saveToFile();
    }

    completeHabit(habitIndex){
        const habit = this.habits.find(h => h.id === habitIndex) ?? null;
        if (!habit) {
            console.log('Habit tidak ditemukan!');
            return false;
        }
        
        const success = habit.markComplete();
        if (success) {
            console.log(`Habit "${habit.name}" berhasil ditandai selesai!`);
        } else {
            console.log(`Habit "${habit.name}" sudah ditandai selesai hari ini.`);
        }
        
        this.#userProfile.updateStats(this.habits);
        this.saveToFile();
        
        return success;
    }

    //display system
    deleteHabit(habitIndex){
        const habit = this.habits[habitIndex-1] ?? null;
        if(!habit){
            console.log('habit tidak ditemukan')
            return false
        }
        this.habits = this.habits.filter(h => h.id !== habit.id);

        this.#userProfile.updateStats(this.habits);
        console.log(`🗑️  Habit "${habit.name}" berhasil dihapus!`);
        this.saveToFile();
        return true;
    }

    //untuk menampilkan profile
    displayProfile(){
        console.log(`nama : ${this.#userProfile.name}`);
        console.log(`join date : ${this.#userProfile.joinDate}`);
        console.log(`total habit : ${this.#userProfile.totalHabits}`);
        console.log(`complete this week : ${this.#userProfile.completedThisWeek}`);
    }

    displayHabits(filter) {
        let filtered = [];

        // Tentukan filter yang dipilih
        if (filter === "all") {
            filtered = this.habits;
            console.log("\n=== 📋 Semua Kebiasaan ===");
        } else if (filter === "completed") {
            filtered = this.habits.filter(h => h.isCompletedThisWeek());
            console.log("\n=== ✅ Kebiasaan Selesai ===");
        } else if (filter === "active") {
            filtered = this.habits.filter(h => !h.isCompletedThisWeek());
            console.log("\n=== 🔄 Kebiasaan Aktif ===");
        } else {
            console.log("⚠️ Filter tidak dikenali!");
            return;
        }

        // Jika kosong
        if (filtered.length === 0) {
            console.log("Tidak ada kebiasaan yang cocok dengan filter ini.\n");
            return;
        }

        // Tampilkan daftar habit dengan format detail
        filtered.forEach((habit, i) => {
            const status = habit.isCompletedThisWeek() ? "[Selesai]" : "[Aktif]";
            const progressCount = habit.getThisWeekCompletions().length;
            const progressPercent = Math.floor(
                (progressCount / habit.targetFrequency) * 100
            );
            const totalBar = 10;
            const filledBar = Math.floor(progressPercent / 10);
            const emptyBar = totalBar - filledBar;

            console.log(`
                ${i + 1}. ${status} ${habit.name}
                Target: ${habit.targetFrequency}x/minggu
                Progress: ${progressCount}/${habit.targetFrequency} (${progressPercent}%)
                Progress Bar: ${"█".repeat(filledBar)}${"░".repeat(emptyBar)} ${progressPercent}%
                `);
            });
        }


    displayHabitsWithWhile() {
        let i = 0;
        while (i < this.habits.length) {
            const habit = this.habits[i];
            console.log(`${i + 1}. ${habit.name} - ${habit.getStatus()}`);
            i++;
        }
    }

    displayHabitsWithFor() {
        for (let i = 0; i < this.habits.length; i++) {
            const habit = this.habits[i];
            console.log(`${i + 1}. ${habit.name} - ${habit.getStatus()}`);
        }
    }

    displayStats() {
        const total = this.#userProfile.totalHabits;
        const completed = this.#userProfile.completedThisWeek;
        const notCompleted = total - completed;
        const overallProgress = total === 0 ? 0 : Math.floor((completed / total) * 100);

        console.log("\n📊 === Statistik Habit Tracker ===");
        console.log(`👤 Nama User        : ${this.#userProfile.name}`);
        console.log(`📅 Bergabung Sejak  : ${this.#userProfile.joinDate}`);
        console.log(`📈 Total Habit Aktif: ${total}`);
        console.log(`✅ Habit Selesai Minggu Ini: ${completed}`);
        console.log(`⏳ Habit Belum Selesai     : ${notCompleted}`);
        console.log(`\n🔥 Progress Keseluruhan Minggu Ini: ${overallProgress}%`);

        const totalBar = 10;
        const filledBar = Math.floor(overallProgress / 10);
        const emptyBar = totalBar - filledBar;
        console.log(`[${"█".repeat(filledBar)}${"░".repeat(emptyBar)}] ${overallProgress}%\n`);

        if (this.habits.length > 0) {
            console.log("Detail Progress:");
            this.habits.forEach((habit, i) => {
                const progress = habit.getProgressPercentage();
                console.log(`${i + 1}. ${habit.name} - ${habit.getStatus()} ${progress}`);
            });
        }
    }

    //reminder system
    startReminder() {
        if (this.#reminderInterval) clearInterval(this.#reminderInterval);
        this.#reminderInterval = setInterval(() => this.showReminder(), REMINDER_INTERVAL);
        console.log("reminder dijalankan")
    }

    showReminder(){
        const pending = this.habits.filter(h => !h.isCompletedThisWeek());
        if (pending.length === 0) return;

        console.log("\n===== REMINDER =====");
        pending.forEach((h,i) => console.log(` ${i+1}. Jangan lupa: "${h.name}"`));
        console.log("======================\n");
    }


    stopReminder(){
        if(this.#reminderInterval){

            clearInterval(this.#reminderInterval);
            this.#reminderInterval = null;
            console.log(`reminder dihentikan`)
        }
        else{
            console.log(`tidak ada reminder yang aktif`)
        }
    }

    //file operation
    saveToFile(){
        const data = {
            userProfile: this.#userProfile,
            habits: this.habits.map(h => h.toJSON())
        };
        fs.writeFileSync(this.#dataFile, JSON.stringify(data, null, 2));
    }

    loadFromFile(){
        if(fs.existsSync(this.#dataFile)){  //Cek file exists
            try {
                const data = JSON.parse(fs.readFileSync(this.#dataFile, "utf-8"));
                this.habits = (data.habits ?? []).map(Habit.fromJSON);
                
                //Update properties satu per satu
                this.#userProfile.name = data.userProfile?.name ?? "User";
                this.#userProfile.joinDate = data.userProfile?.joinDate ?? new Date().toISOString();
                this.#userProfile.updateStats(this.habits);
                
                console.log(`Data berhasil dimuat dari file!`);
            } catch(err) {
                this.habits = [];
                this.#userProfile.updateStats(this.habits);
            }
        }
        else{
            console.log(`⚠️ File data tidak ditemukan. Memulai data baru...`)
        }
    }

    clearAllData(){
        this.habits = [];
        this.#userProfile.updateStats(this.habits);
        if (fs.existsSync(this.#dataFile)) fs.unlinkSync(this.#dataFile);
        console.log(`semua data telah dihapus`);
    }

}

function askQuestion(question){
    return new Promise((resolve) => {
        rl.question(question,(answer)=>{
            resolve(answer.trim());
        })
    });
};

function displayMenu() {
    console.clear();
    console.log(`
====================================
    HABIT TRACKER - MAIN MENU
====================================
1. Lihat Profil
2. Lihat Semua Kebiasaan
3. Lihat Kebiasaan Aktif
4. Lihat Kebiasaan Selesai
5. Tambah Kebiasaan Baru
6. Tandai Kebiasaan Selesai
7. Hapus Kebiasaan
8. Lihat Statistik
9. Demo Loop (While/For)
10. Stop Reminder
11. Start Reminder
12. Clear All Data
0. Keluar
------------------------------------
`);
}


async function handleMenu(tracker) {
    let exit = false;

    while (!exit) {
        displayMenu();
        const choice = await askQuestion("Pilih menu (0-12): ");

        switch (choice) {
            case "1":
                tracker.displayProfile();
                break;

            case "2":
                tracker.displayHabits("all");
                break;

            case "3":
                console.log("=== Kebiasaan Aktif (Belum Selesai) ===");
                tracker.displayHabits("active");
                break;

            case "4":
                console.log("=== Kebiasaan Selesai ===");
                tracker.displayHabits("completed");
                break;

            case "5": {
                const name = await askQuestion("Masukkan nama kebiasaan: ");
                const freq = await askQuestion("Masukkan target frekuensi per minggu: ");
                tracker.addHabit(name, parseInt(freq));
                console.log(`Habit "${name}" berhasil ditambahkan!`);
                break;
            }

            case "6": {
                tracker.displayHabits("all");
                const index = await askQuestion("Masukkan nomor habit yang selesai: ");
                tracker.completeHabit(parseInt(index));
                break;
            }

            case "7": {
                tracker.displayHabits("all");
                const index = await askQuestion("Masukkan nomor habit yang ingin dihapus: ");
                tracker.deleteHabit(parseInt(index));
                break;
            }

            case "8":
                tracker.displayStats();
                break;

            case "9":
                console.log("=== Demo Loop Display ===");
                tracker.displayHabitsWithWhile();
                tracker.displayHabitsWithFor();
                break;

            case "10":
                tracker.stopReminder();
                break;

            case "11":
                tracker.startReminder();
                break;

            case "12":
                tracker.clearAllData();
                break;
            case "0":
                console.log("\n Keluar dari Habit Tracker. Sampai jumpa!");
                tracker.stopReminder?.();
                rl.close();
                exit = true;
                break;

            default:
                console.log("Pilihan tidak valid. Silakan pilih antara 0-9.");
        }

        if (!exit) await askQuestion("\nTekan ENTER untuk kembali ke menu...");
    }
}


async function main() {
    console.clear();
    const tracker = new HabitTracker();
    
    tracker.loadFromFile();
    
    tracker.startReminder();

    await handleMenu(tracker);
}

main().catch(err => {
    console.error("Terjadi kesalahan:", err);
    rl.close();
});
