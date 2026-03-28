import * as icons from 'lucide-react';

const checkIcons = [
    'Users', 'AlertTriangle', 'Shield', 'Activity',
    'TrendingUp', 'DollarSign', 'BookOpen',
    'FileUser', 'CheckCircle', 'Clock',
    'CreditCard', 'FileText', 'Search',
    'Home', 'Megaphone', 'GraduationCap', 'Library', 'CalendarDays', 'Calendar', 'Award', 'Mail', 'FolderOpen', 'LogOut'
];

checkIcons.forEach(name => {
    if (!icons[name]) {
        console.log(`Icon MISSING: ${name}`);
    }
});
console.log('Done checking icons.');
