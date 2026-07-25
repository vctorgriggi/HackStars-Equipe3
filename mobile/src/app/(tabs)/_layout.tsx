import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { FolderClosed, Home, Users, Video } from 'lucide-react-native';

import { FabItem, TabBar, TabBarItem } from '@/components/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="home" href="/" asChild>
            <TabBarItem icon={Home} label="Dashboard" />
          </TabTrigger>
          <TabTrigger name="projects" href="/projects" asChild>
            <TabBarItem icon={FolderClosed} label="Projetos" />
          </TabTrigger>
          <TabTrigger name="occurrences" href="/occurrences" asChild>
            <FabItem />
          </TabTrigger>
          <TabTrigger name="cameras" href="/cameras" asChild>
            <TabBarItem icon={Video} label="Câmeras" />
          </TabTrigger>
          <TabTrigger name="clients" href="/clients" asChild>
            <TabBarItem icon={Users} label="Clientes" />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
