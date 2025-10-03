import { useState, useRef } from "react";
import { Bluetooth, BluetoothConnected, BluetoothOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function BluetoothConnect() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>("");
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const disconnectHandlerRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  const connectBluetooth = async () => {
    if (!isBluetoothSupported) {
      toast({
        title: "Not Supported",
        description: "Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera.",
        variant: "destructive",
      });
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'heart_rate', 'device_information']
      });

      deviceRef.current = device;
      setDeviceName(device.name || "Unknown Device");
      setIsConnected(true);
      setIsOpen(false);

      toast({
        title: "Connected",
        description: `Successfully connected to ${device.name || "device"}`,
      });

      const handleDisconnect = () => {
        if (deviceRef.current && disconnectHandlerRef.current) {
          deviceRef.current.removeEventListener('gattserverdisconnected', disconnectHandlerRef.current);
        }
        
        setIsConnected(false);
        setDeviceName("");
        deviceRef.current = null;
        disconnectHandlerRef.current = null;
        
        toast({
          title: "Disconnected",
          description: "Bluetooth device disconnected",
          variant: "destructive",
        });
      };

      disconnectHandlerRef.current = handleDisconnect;
      device.addEventListener('gattserverdisconnected', handleDisconnect);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        toast({
          title: "Cancelled",
          description: "Bluetooth device selection cancelled",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to Bluetooth device",
          variant: "destructive",
        });
      }
    }
  };

  const disconnectBluetooth = () => {
    if (deviceRef.current && disconnectHandlerRef.current) {
      deviceRef.current.removeEventListener('gattserverdisconnected', disconnectHandlerRef.current);
    }
    
    if (deviceRef.current?.gatt) {
      deviceRef.current.gatt.disconnect();
    }
    
    setIsConnected(false);
    setDeviceName("");
    deviceRef.current = null;
    disconnectHandlerRef.current = null;
    setIsOpen(false);
    
    toast({
      title: "Disconnected",
      description: "Bluetooth device disconnected successfully",
    });
  };

  if (!isBluetoothSupported) {
    return (
      <Button
        size="icon"
        variant="ghost"
        disabled
        data-testid="button-bluetooth-unsupported"
        className="opacity-50"
      >
        <BluetoothOff className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsOpen(true)}
        data-testid="button-bluetooth"
        className={isConnected ? "text-primary" : ""}
      >
        {isConnected ? (
          <BluetoothConnected className="h-5 w-5" />
        ) : (
          <Bluetooth className="h-5 w-5" />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent data-testid="dialog-bluetooth">
          <DialogHeader>
            <DialogTitle>Bluetooth Connection</DialogTitle>
            <DialogDescription>
              {isConnected
                ? `Connected to ${deviceName}`
                : "Connect to a Bluetooth device for health tracking, fitness devices, or other IoT integration."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isConnected ? (
              <div className="text-center py-4">
                <BluetoothConnected className="h-16 w-16 mx-auto text-primary mb-4" />
                <p className="text-lg font-semibold mb-2">{deviceName}</p>
                <p className="text-sm text-muted-foreground mb-4">Device is connected</p>
                <Button
                  variant="destructive"
                  onClick={disconnectBluetooth}
                  data-testid="button-disconnect-bluetooth"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Bluetooth className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click connect to scan for nearby Bluetooth devices
                </p>
                <Button
                  onClick={connectBluetooth}
                  data-testid="button-connect-bluetooth"
                  className="w-full"
                >
                  <Bluetooth className="h-4 w-4 mr-2" />
                  Connect Device
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
